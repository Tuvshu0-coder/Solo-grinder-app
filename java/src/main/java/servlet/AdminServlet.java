// AdminServlet: every admin page (AuthFilter only lets admins reach /admin/...).
//   /admin                 statistics
//   /admin/users           students; POST /admin/users/suspend
//   /admin/quests          daily quest templates; POST saves one; POST /admin/quests/toggle
//   /admin/achievements    achievements; POST saves one
//   /admin/levels          levels and ranks; POST saves one
package servlet;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import dao.AchievementDAO;
import dao.GuildDAO;
import dao.LevelDAO;
import dao.QuestDAO;
import dao.TaskDAO;
import dao.UserDAO;
import dao.XpLogDAO;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import model.ConditionType;
import model.GoalType;
import model.GuildMember;
import model.Level;
import model.QuestTemplate;
import model.TaskStatus;
import model.TaskType;
import model.User;
import service.GuildService;
import util.DBManager;
import util.MnTime;

@WebServlet({"/admin", "/admin/users", "/admin/users/suspend", "/admin/quests", "/admin/quests/toggle",
        "/admin/achievements", "/admin/levels"})
public class AdminServlet extends BaseServlet {

    private static final Set<String> RANKS = Set.of("E", "D", "C", "B", "A", "S");

    @Override
    protected void get(HttpServletRequest req, HttpServletResponse res) throws Exception {
        switch (req.getServletPath()) {
            case "/admin" -> stats(req, res);
            case "/admin/users" -> {
                String q = str(req, "q");
                req.setAttribute("q", q);
                req.setAttribute("users", DBManager.read(con -> new UserDAO(con).findStudents(q)));
                render(req, res, "admin/users");
            }
            case "/admin/quests" -> {
                req.setAttribute("templates", DBManager.read(con -> new QuestDAO(con).findTemplates(false)));
                req.setAttribute("goalTypes", GoalType.values());
                req.setAttribute("taskTypes", TaskType.values());
                render(req, res, "admin/quests");
            }
            case "/admin/achievements" -> {
                req.setAttribute("achievements", DBManager.read(con -> new AchievementDAO(con).findAll()));
                req.setAttribute("conditionTypes", ConditionType.values());
                render(req, res, "admin/achievements");
            }
            case "/admin/levels" -> {
                List<Level> levels = DBManager.read(con -> new LevelDAO(con).findAll());
                int nextId = (levels.isEmpty() ? 0 : levels.get(levels.size() - 1).getId()) + 1;
                req.setAttribute("levels", levels);
                req.setAttribute("nextId", nextId);
                req.setAttribute("nextMinXp", 20 * nextId * nextId);
                render(req, res, "admin/levels");
            }
            // a GET on an action URL (e.g. after a refresh) just shows its page
            default -> go(req, res, req.getServletPath().startsWith("/admin/users") ? "/admin/users" : "/admin/quests");
        }
    }

    private void stats(HttpServletRequest req, HttpServletResponse res) throws Exception {
        Instant now = Instant.now();
        Map<String, Long> stats = DBManager.read(con -> {
            UserDAO users = new UserDAO(con);
            TaskDAO tasks = new TaskDAO(con);
            XpLogDAO xp = new XpLogDAO(con);
            Map<String, Long> m = new LinkedHashMap<>();
            m.put("Students", (long) users.countStudents(false));
            m.put("Active (7 days)", (long) xp.countActiveUsersSince(now.minus(Duration.ofDays(7))));
            m.put("Suspended", (long) users.countStudents(true));
            m.put("Guild", (long) new GuildDAO(con).countAll());
            m.put("Tasks finished", (long) tasks.countWithStatus(TaskStatus.DONE));
            m.put("Finished today", (long) tasks.countDoneSince(MnTime.dayStart(MnTime.dayKey(now))));
            m.put("Late (not done)", (long) tasks.countWithStatus(TaskStatus.LATE));
            m.put("Total XP given", xp.sumAll());
            return m;
        });
        req.setAttribute("stats", stats);
        render(req, res, "admin/stats");
    }

    @Override
    protected void post(HttpServletRequest req, HttpServletResponse res) throws Exception {
        String path = req.getServletPath();
        String result = switch (path) {
            case "/admin/users/suspend" -> suspend(req);
            case "/admin/quests" -> saveTemplate(req);
            case "/admin/quests/toggle" -> toggleTemplate(req);
            case "/admin/achievements" -> saveAchievement(req);
            case "/admin/levels" -> saveLevel(req);
            default -> "err:Unknown action.";
        };
        String page = path.startsWith("/admin/users") ? "/admin/users" : path.startsWith("/admin/quests") ? "/admin/quests" : path;
        back(req, res, page, result.substring(0, 3), result.substring(4)); // result = "msg:..." or "err:..."
    }

    private String suspend(HttpServletRequest req) throws Exception {
        int userId = num(req, "userId");
        boolean suspend = str(req, "suspend").equals("1");
        return DBManager.transaction(con -> {
            UserDAO users = new UserDAO(con);
            User user = users.findById(userId);
            if (user == null || user.isAdmin()) return "err:User not found.";
            users.setSuspended(userId, suspend);
            if (suspend) {
                users.deleteSessionsOf(userId); // logged out everywhere
                GuildMember m = new GuildDAO(con).findMembership(userId);
                if (m != null && m.isLeader()) new GuildService(con).promoteOldest(m.getGuildId(), userId); // rule 20
            }
            return "msg:" + user.getUsername() + (suspend ? " suspended." : " restored.");
        });
    }

    private String saveTemplate(HttpServletRequest req) throws Exception {
        int id = num(req, "id");
        String title = str(req, "title");
        GoalType goal = GoalType.parse(str(req, "goalType"));
        TaskType taskType = TaskType.parse(str(req, "taskType"));
        int target = num(req, "targetValue");
        int xp = num(req, "xpReward");
        if (title.isEmpty()) return "err:Enter a title.";
        if (goal == null) return "err:Invalid goal type.";
        if (goal == GoalType.COMPLETE_TYPE && taskType == null) return "err:Choose a task type.";
        if (target < 1 || xp < 0) return "err:Target must be ≥ 1 and XP ≥ 0.";
        TaskType type = goal == GoalType.COMPLETE_TYPE ? taskType : null;
        DBManager.read(con -> {
            QuestDAO quests = new QuestDAO(con);
            if (id > 0) quests.updateTemplate(id, title, goal, type, target, xp);
            else quests.insertTemplate(title, goal, type, target, xp);
            return null;
        });
        return "msg:Quest template saved.";
    }

    private String toggleTemplate(HttpServletRequest req) throws Exception {
        int id = num(req, "id");
        return DBManager.read(con -> {
            QuestDAO quests = new QuestDAO(con);
            QuestTemplate t = quests.findTemplate(id);
            if (t == null) return "err:Template not found.";
            quests.setTemplateActive(id, !t.isActive());
            return t.isActive() ? "msg:Template turned off." : "msg:Template turned on.";
        });
    }

    private String saveAchievement(HttpServletRequest req) throws Exception {
        int id = num(req, "id");
        String name = str(req, "name");
        String description = str(req, "description");
        ConditionType type = ConditionType.parse(str(req, "conditionType"));
        int threshold = num(req, "threshold");
        int xp = num(req, "xpReward");
        if (name.isEmpty()) return "err:Enter a name.";
        if (type == null) return "err:Invalid condition type.";
        if (threshold < 1 || xp < 0) return "err:Threshold must be ≥ 1 and XP ≥ 0.";
        DBManager.read(con -> {
            AchievementDAO achievements = new AchievementDAO(con);
            if (id > 0) achievements.update(id, name, description, type, threshold, xp);
            else achievements.insert(name, description, type, threshold, xp);
            return null;
        });
        return "msg:Achievement saved.";
    }

    private String saveLevel(HttpServletRequest req) throws Exception {
        int id = num(req, "id");
        int minXp = num(req, "minXp");
        String rank = str(req, "rank").toUpperCase();
        if (id < 1) return "err:Invalid level.";
        if (!RANKS.contains(rank)) return "err:Rank must be one of E, D, C, B, A, S.";
        if (id == 1 && minXp != 0) return "err:Level 1 must start at 0 XP.";
        return DBManager.transaction(con -> {
            LevelDAO levels = new LevelDAO(con);
            Level prev = levels.find(id - 1);
            Level next = levels.find(id + 1);
            if ((prev != null && minXp <= prev.getMinXp()) || (next != null && minXp >= next.getMinXp()))
                return "err:The threshold must be above the previous level and below the next one.";
            levels.save(id, minXp, rank);
            new UserDAO(con).recomputeAllLevels(); // everyone's level against the new thresholds
            return "msg:Level " + id + " saved.";
        });
    }
}
