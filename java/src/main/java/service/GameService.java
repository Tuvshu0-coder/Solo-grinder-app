// GameService: the game engine (sections 8 and 10 of the requirements).
// Every XP change goes through grantXp(), so the 400 XP daily cap can never be skipped.
//
// It works on one Connection. Callers run it inside DBManager.transaction(...), so finishing a
// task (XP, quests, streak, achievements, level, guild quest) is saved completely or not at all.
package service;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
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
import model.Achievement;
import model.CompleteResult;
import model.Completion;
import model.DailyQuest;
import model.GoalType;
import model.GuildMember;
import model.GuildQuest;
import model.OpenTasks;
import model.PlayerStats;
import model.QuestTemplate;
import model.Task;
import model.User;
import model.XpSource;
import util.MnTime;
import util.Rules;

public class GameService {

    private final UserDAO users;
    private final TaskDAO tasks;
    private final XpLogDAO xp;
    private final LevelDAO levels;
    private final QuestDAO quests;
    private final AchievementDAO achievements;
    private final GuildDAO guilds;

    public GameService(Connection con) {
        users = new UserDAO(con);
        tasks = new TaskDAO(con);
        xp = new XpLogDAO(con);
        levels = new LevelDAO(con);
        quests = new QuestDAO(con);
        achievements = new AchievementDAO(con);
        guilds = new GuildDAO(con);
    }

    // ---------- XP ----------

    public int xpToday(int userId, Instant now) throws SQLException {
        return xp.sumSince(userId, MnTime.dayStart(MnTime.dayKey(now)));
    }

    /** Gives XP within today's 400 cap (rule 9). Returns how much was actually given. */
    public int grantXp(int userId, int amount, XpSource source, Integer sourceId, Instant now) throws SQLException {
        if (amount <= 0) return 0;
        int granted = Rules.capXp(amount, xpToday(userId, now));
        xp.insert(userId, source, sourceId, granted, now);
        if (granted > 0) users.addXp(userId, granted);
        return granted;
    }

    /** Moves the user to the level their total XP reaches; returns that level. */
    public int updateLevel(int userId) throws SQLException {
        User u = users.findById(userId);
        int level = levels.levelFor(u.getTotalXp());
        if (level != u.getLevelId()) users.setLevel(userId, level);
        return level;
    }

    // ---------- the "00:00 job", run lazily on every request ----------

    public void runMaintenance(Instant now) throws SQLException {
        tasks.markOverdueLate(now);                                            // rule 10
        users.resetBrokenStreaks(MnTime.addDays(MnTime.dayKey(now), -1));      // rule 12
    }

    // ---------- daily quests (rule 11) ----------

    /** Gives the student today's 3 quests, once per day. Must run inside a transaction. */
    public void ensureDailyQuests(int userId, Instant now) throws SQLException {
        String today = MnTime.dayKey(now);
        if (quests.countDaily(userId, today) > 0) return;

        OpenTasks open = tasks.openTasks(userId);
        List<QuestTemplate> possible = new ArrayList<>();
        for (QuestTemplate t : quests.findTemplates(true)) {
            if (t.getGoal().isPossible(open)) possible.add(t); // impossible quests are swapped out
        }

        // Prefer 3 different goal types; if there aren't enough types, fill up with any others.
        List<QuestTemplate> picked = new ArrayList<>();
        Set<GoalType> usedTypes = new HashSet<>();
        Collections.shuffle(possible);
        for (QuestTemplate t : possible) {
            if (picked.size() >= Rules.DAILY_QUEST_COUNT) break;
            if (usedTypes.add(t.getGoalType())) picked.add(t);
        }
        Collections.shuffle(possible);
        for (QuestTemplate t : possible) {
            if (picked.size() >= Rules.DAILY_QUEST_COUNT) break;
            if (!picked.contains(t)) picked.add(t);
        }
        for (QuestTemplate t : picked) quests.insertDaily(userId, t.getId(), today);
    }

    // ---------- finishing a task (section 10, steps 5-7) ----------

    public CompleteResult completeTask(int userId, int taskId, Instant now) throws SQLException, GameException {
        Task task = tasks.findOwned(taskId, userId);
        if (task == null) throw new GameException("Task not found.");
        if (task.isDone()) throw new GameException("This task is already done.");

        String today = MnTime.dayKey(now);
        User user = users.findById(userId);
        int startLevel = user.getLevelId();

        // Rule 8: at most 3 early bonuses a day.
        int earlyToday = tasks.countDone(userId, MnTime.dayStart(today), true);
        double multiplier = Rules.multiplier(task.getCreatedAt(), task.getDeadline(), task.isDeadlineEdited(), now, earlyToday);
        int baseXp = Rules.xpFor(multiplier);
        boolean wasLate = now.isAfter(task.getDeadline());

        int granted = grantXp(userId, baseXp, XpSource.TASK, task.getId(), now);
        tasks.complete(task.getId(), now, multiplier, granted);
        CompleteResult result = new CompleteResult(multiplier, baseXp, granted);

        Completion done = new Completion(task.getType(), multiplier >= 1.2, wasLate);

        // Step 6a: daily quests. The goal object decides whether this task counts (polymorphism).
        for (DailyQuest q : quests.findDaily(userId, today, true)) {
            QuestTemplate t = q.getTemplate();
            if (!t.getGoal().counts(done)) continue;
            int progress = q.getProgress() + 1;
            boolean finished = progress >= t.getTargetValue();
            quests.updateDaily(q.getId(), progress, finished);
            if (finished) {
                grantXp(userId, t.getXpReward(), XpSource.QUEST, q.getId(), now);
                result.getQuestsCompleted().add(t.getTitle());
            }
        }

        // Step 6b: streak. Only on-time finishes count (rule 12).
        if (!wasLate) {
            int streak = Rules.nextStreak(user.getStreak(), user.getLastActiveDate(), today, MnTime.addDays(today, -1));
            users.setStreak(userId, streak, today);
        }

        // Steps 6c/6d: achievements, then level (once more, so a LEVEL achievement can fire).
        result.getAchievementsUnlocked().addAll(checkAchievements(userId, now));
        int level = updateLevel(userId);
        if (level != startLevel) {
            result.getAchievementsUnlocked().addAll(checkAchievements(userId, now));
            level = updateLevel(userId);
        }
        if (level != startLevel) result.setLeveledUpTo(level);

        // Step 7: the guild's weekly quest.
        result.setGuildQuestCompleted(progressGuildQuest(userId, done, now));
        return result;
    }

    /** Unlocks every achievement the user now qualifies for (once each, rule 14). Returns their names. */
    private List<String> checkAchievements(int userId, Instant now) throws SQLException {
        Map<Integer, Instant> owned = achievements.unlockedBy(userId);
        User user = users.findById(userId);
        PlayerStats stats = new PlayerStats(user.getStreak(), tasks.countDone(userId, null, false),
                tasks.countDone(userId, null, true), user.getLevelId());

        List<String> unlocked = new ArrayList<>();
        for (Achievement a : achievements.findAll()) {
            if (owned.containsKey(a.getId()) || !a.isReachedBy(stats)) continue;
            achievements.unlock(userId, a.getId(), now);
            grantXp(userId, a.getXpReward(), XpSource.ACHIEVEMENT, a.getId(), now); // inside the cap (rule 9)
            unlocked.add(a.getName());
        }
        return unlocked;
    }

    /** Moves the guild quest forward. When it is done, +50 XP to every member active this week (rule 19). */
    private boolean progressGuildQuest(int userId, Completion done, Instant now) throws SQLException {
        GuildMember member = guilds.findMembership(userId);
        if (member == null) return false;
        String weekStart = MnTime.weekStartKey(now);
        GuildQuest quest = guilds.findQuest(member.getGuildId(), weekStart);
        if (quest == null || quest.isCompleted() || !quest.getGoal().counts(done)) return false;

        int progress = quest.getProgress() + 1;
        boolean finished = progress >= quest.getTargetValue();
        guilds.updateQuest(quest.getId(), progress, finished);
        if (!finished) return false;

        Instant weekStartAt = MnTime.dayStart(weekStart);
        for (GuildMember m : guilds.findMembers(member.getGuildId())) {
            if (tasks.countDone(m.getUserId(), weekStartAt, false) > 0) {
                grantXp(m.getUserId(), Rules.GUILD_QUEST_REWARD, XpSource.GUILD_QUEST, quest.getId(), now);
                updateLevel(m.getUserId());
            }
        }
        return true;
    }
}
