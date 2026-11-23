// GuildServlet: GET /guild and the guild actions (create, join, leave, kick, transfer, set quest).
package servlet;

import java.time.Instant;
import java.util.List;

import dao.GuildDAO;
import dao.UserDAO;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import model.GoalType;
import model.Guild;
import model.GuildMember;
import model.LeaderboardRow;
import model.TaskType;
import model.User;
import service.GuildService;
import util.DBManager;
import util.MnTime;
import util.Rules;

@WebServlet({"/guild", "/guild/create", "/guild/join", "/guild/leave", "/guild/kick", "/guild/transfer", "/guild/quest"})
public class GuildServlet extends BaseServlet {

    private static final String PAGE = "/guild";

    @Override
    protected void get(HttpServletRequest req, HttpServletResponse res) throws Exception {
        if (!req.getServletPath().equals(PAGE)) {
            go(req, res, PAGE);
            return;
        }
        User user = user(req);
        Instant now = Instant.now();
        DBManager.read(con -> {
            GuildDAO guilds = new GuildDAO(con);
            GuildMember me = guilds.findMembership(user.getId());
            req.setAttribute("membership", me);
            if (me == null) {
                Instant until = cooldownUntil(user);
                req.setAttribute("cooldownUntil", until != null && until.isAfter(now) ? until : null);
                return null;
            }
            Guild guild = guilds.find(me.getGuildId());
            String weekStart = MnTime.weekStartKey(now);
            List<LeaderboardRow> board = new GuildService(con).leaderboard(guild.getId(), now);
            req.setAttribute("guild", guild);
            req.setAttribute("weekStart", weekStart);
            req.setAttribute("board", board);
            req.setAttribute("totalWeekXp", board.stream().mapToInt(LeaderboardRow::getWeekXp).sum());
            req.setAttribute("topXp", Math.max(1, board.stream().mapToInt(LeaderboardRow::getWeekXp).max().orElse(0)));
            req.setAttribute("quest", guilds.findQuest(guild.getId(), weekStart));
            req.setAttribute("minTarget", Rules.minGuildQuestTarget(guild.getMemberCount()));
            return null;
        });
        req.setAttribute("maxMembers", Rules.GUILD_MAX_MEMBERS);
        req.setAttribute("reward", Rules.GUILD_QUEST_REWARD);
        req.setAttribute("goalTypes", GoalType.values());
        req.setAttribute("taskTypes", TaskType.values());
        render(req, res, "guild");
    }

    @Override
    protected void post(HttpServletRequest req, HttpServletResponse res) throws Exception {
        User user = user(req);
        String err = switch (req.getServletPath()) {
            case "/guild/create" -> create(req, user);
            case "/guild/join" -> join(req, user);
            case "/guild/leave" -> leave(user);
            case "/guild/kick" -> kick(req, user);
            case "/guild/transfer" -> transfer(req, user);
            default -> setQuest(req, user);
        };
        // Each action returns "err:..." or "msg:..."
        back(req, res, PAGE, err.substring(0, 3), err.substring(4));
    }

    /** Rule 16: 7 days after leaving a guild, you can join or create another. */
    private static Instant cooldownUntil(User user) {
        return user.getGuildLeftAt() == null ? null : user.getGuildLeftAt().plus(Rules.GUILD_COOLDOWN);
    }

    private static String cooldownError(User user) {
        Instant until = cooldownUntil(user);
        return until != null && until.isAfter(Instant.now())
                ? "err:You left a guild less than 7 days ago. You can join again after " + MnTime.fmt(until) + "."
                : null;
    }

    private String create(HttpServletRequest req, User user) throws Exception {
        String name = str(req, "name");
        if (name.isEmpty() || name.length() > 40) return "err:Guild name must be 1–40 characters.";
        return DBManager.transaction(con -> {
            GuildDAO guilds = new GuildDAO(con);
            if (guilds.findMembership(user.getId()) != null) return "err:You are already in a guild."; // rule 15
            String cd = cooldownError(user);
            if (cd != null) return cd;
            String code = GuildService.newInviteCode();
            while (guilds.findByCode(code) != null) code = GuildService.newInviteCode();
            Instant now = Instant.now();
            int id = guilds.create(name, code, now);
            guilds.addMember(id, user.getId(), "LEADER", now);
            return "msg:Created guild \"" + name + "\". Invite code: " + code;
        });
    }

    private String join(HttpServletRequest req, User user) throws Exception {
        String code = str(req, "code").toUpperCase();
        return DBManager.transaction(con -> {
            GuildDAO guilds = new GuildDAO(con);
            if (guilds.findMembership(user.getId()) != null) return "err:You are already in a guild.";
            String cd = cooldownError(user);
            if (cd != null) return cd;
            Guild guild = guilds.findByCode(code);
            if (guild == null) return "err:Invalid invite code.";
            if (guild.getMemberCount() >= Rules.GUILD_MAX_MEMBERS) return "err:This guild is full (30 members).";
            guilds.addMember(guild.getId(), user.getId(), "MEMBER", Instant.now());
            return "msg:Joined \"" + guild.getName() + "\"!";
        });
    }

    private String leave(User user) throws Exception {
        return DBManager.transaction(con -> {
            GuildMember me = new GuildDAO(con).findMembership(user.getId());
            if (me == null) return "err:You are not in a guild.";
            new GuildService(con).removeMember(me.getGuildId(), user.getId()); // rule 20
            new UserDAO(con).setGuildLeftAt(user.getId(), Instant.now());     // rule 16
            return "msg:You left the guild. You can join another one in 7 days.";
        });
    }

    private String kick(HttpServletRequest req, User user) throws Exception {
        int targetId = num(req, "userId");
        return DBManager.transaction(con -> {
            GuildMember leader = new GuildDAO(con).findMembership(user.getId());
            if (leader == null || !leader.isLeader()) return "err:Only the guild leader can do that.";
            if (targetId == user.getId()) return "err:You can't remove yourself. Use Leave guild instead.";
            new GuildService(con).removeMember(leader.getGuildId(), targetId);
            return "msg:Member removed.";
        });
    }

    private String transfer(HttpServletRequest req, User user) throws Exception {
        int targetId = num(req, "userId");
        return DBManager.transaction(con -> {
            GuildDAO guilds = new GuildDAO(con);
            GuildMember leader = guilds.findMembership(user.getId());
            if (leader == null || !leader.isLeader()) return "err:Only the guild leader can do that.";
            GuildMember target = guilds.findMembership(targetId);
            if (target == null || target.getGuildId() != leader.getGuildId()) return "err:Member not found.";
            guilds.setRole(user.getId(), "MEMBER");
            guilds.setRole(targetId, "LEADER");
            return "msg:Leadership handed over.";
        });
    }

    private String setQuest(HttpServletRequest req, User user) throws Exception {
        GoalType goal = GoalType.parse(str(req, "goalType"));
        TaskType taskType = TaskType.parse(str(req, "taskType"));
        int target = num(req, "targetValue");
        if (goal == null) return "err:Choose a goal type.";
        if (goal == GoalType.COMPLETE_TYPE && taskType == null) return "err:Choose a task type.";
        return DBManager.transaction(con -> {
            GuildDAO guilds = new GuildDAO(con);
            GuildMember leader = guilds.findMembership(user.getId());
            if (leader == null || !leader.isLeader()) return "err:Only the guild leader can do that.";
            int min = Rules.minGuildQuestTarget(guilds.countMembers(leader.getGuildId())); // rule 18
            if (target < min) return "err:The target must be at least " + min + " (members × 3).";
            String weekStart = MnTime.weekStartKey(Instant.now());
            if (guilds.findQuest(leader.getGuildId(), weekStart) != null) return "err:This week's guild quest is already set.";
            boolean oneType = goal == GoalType.COMPLETE_TYPE;
            String title = goal.getLabel() + (oneType ? " (" + taskType.getLabel() + ")" : "") + ": " + target + " total";
            guilds.insertQuest(leader.getGuildId(), title, goal, oneType ? taskType : null, target, weekStart);
            return "msg:This week's guild quest is set.";
        });
    }
}
