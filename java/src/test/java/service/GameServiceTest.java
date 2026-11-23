// End-to-end checks of the game engine against a throwaway database
// (same scenarios as the original scripts/integration-test.ts).
package service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import dao.GuildDAO;
import dao.QuestDAO;
import dao.SubjectDAO;
import dao.TaskDAO;
import dao.UserDAO;
import dao.XpLogDAO;
import model.CompleteResult;
import model.DailyQuest;
import model.GoalType;
import model.LeaderboardRow;
import model.Task;
import model.TaskStatus;
import model.TaskType;
import model.XpSource;
import util.DBManager;
import util.MnTime;

class GameServiceTest {

    static final Duration HOUR = Duration.ofHours(1);
    static final Duration DAY = Duration.ofDays(1);
    static final Instant NOW = Instant.now();
    static int counter;

    record Player(int userId, int subjectId) {}

    @BeforeAll
    static void freshDatabase() throws Exception {
        Path file = Files.createTempFile("solo-grinding-test", ".db");
        Files.delete(file); // DbSetup creates it from schema.sql
        file.toFile().deleteOnExit();
        DBManager.usePath(file.toString());
        DbSetup.ensure();
    }

    static Instant ago(Duration d) { return NOW.minus(d); }
    static Instant ahead(Duration d) { return NOW.plus(d); }

    static Player player() throws Exception {
        return DBManager.transaction(con -> {
            int id = new UserDAO(con).insert("t" + System.nanoTime() + "_" + counter++, "x", "STUDENT", NOW);
            new SubjectDAO(con).insert(id, "Test");
            int subjectId = (int) con.createStatement().executeQuery("SELECT MAX(id) FROM Subject").getLong(1);
            return new Player(id, subjectId);
        });
    }

    static int task(Player p, Instant createdAt, Instant deadline, TaskType type) throws Exception {
        return DBManager.transaction(con -> {
            new TaskDAO(con).insert(p.subjectId(), "t", type, deadline, createdAt);
            return (int) con.createStatement().executeQuery("SELECT MAX(id) FROM Task").getLong(1);
        });
    }

    static CompleteResult complete(Player p, int taskId, Instant at) throws Exception {
        return DBManager.transaction(con -> {
            try {
                return new GameService(con).completeTask(p.userId(), taskId, at);
            } catch (GameException e) {
                throw new IllegalStateException(e);
            }
        });
    }

    static <T> T read(DBManager.Work<T> w) throws Exception {
        return DBManager.read(w);
    }

    @Test
    void specExampleTenDayTaskOnDayThreeGives75Xp() throws Exception {
        Player p = player();
        CompleteResult r = complete(p, task(p, ago(DAY.multipliedBy(3)), ahead(DAY.multipliedBy(7)), TaskType.HOMEWORK), NOW);
        assertEquals(1.5, r.getMultiplier());
        assertEquals(75, r.getGranted());
    }

    @Test
    void paddingIsBlocked() throws Exception {
        Player p = player();
        CompleteResult r = complete(p, task(p, NOW, ahead(DAY.multipliedBy(30)), TaskType.HOMEWORK), NOW);
        assertEquals(1.0, r.getMultiplier());
    }

    @Test
    void threeEarlyBonusesPerDayAndTheDailyCapHolds() throws Exception {
        Player p = player();
        double[] mults = new double[8];
        for (int i = 0; i < 8; i++) {
            mults[i] = complete(p, task(p, ago(DAY.multipliedBy(2)), ahead(DAY.multipliedBy(10)), TaskType.HOMEWORK), NOW)
                    .getMultiplier();
        }
        assertEquals(1.5, mults[0]);
        assertEquals(1.5, mults[1]);
        assertEquals(1.5, mults[2]);
        assertEquals(1.0, mults[3]);
        int today = read(con -> new GameService(con).xpToday(p.userId(), NOW));
        assertTrue(today <= 400, "today=" + today);
        assertEquals(today, read(con -> new UserDAO(con).findById(p.userId())).getTotalXp());
    }

    @Test
    void lateTaskBecomesLateGivesX02AndNoStreak() throws Exception {
        Player p = player();
        int t = task(p, ago(DAY.multipliedBy(5)), ago(DAY.multipliedBy(2)), TaskType.HOMEWORK);
        read(con -> { new GameService(con).runMaintenance(NOW); return null; });
        assertEquals(TaskStatus.LATE, read(con -> new TaskDAO(con).findOwned(t, p.userId())).getStatus());
        assertEquals(0.2, complete(p, t, NOW).getMultiplier());
        assertEquals(0, read(con -> new UserDAO(con).findById(p.userId())).getStreak());
    }

    @Test
    void streakGrowsAcrossDaysAndResetsAfterASkippedDay() throws Exception {
        Player p = player();
        complete(p, task(p, ago(DAY.multipliedBy(3)), ahead(DAY.multipliedBy(5)), TaskType.HOMEWORK), ago(DAY));
        complete(p, task(p, ago(DAY.multipliedBy(3)), ahead(DAY.multipliedBy(5)), TaskType.HOMEWORK), NOW);
        assertEquals(2, read(con -> new UserDAO(con).findById(p.userId())).getStreak());
        read(con -> {
            new UserDAO(con).setStreak(p.userId(), 2, "2000-01-01");
            new GameService(con).runMaintenance(NOW);
            return null;
        });
        assertEquals(0, read(con -> new UserDAO(con).findById(p.userId())).getStreak());
    }

    @Test
    void threeDifferentPossibleDailyQuestsOncePerDay() throws Exception {
        Player p = player();
        task(p, ago(DAY.multipliedBy(2)), ahead(DAY.multipliedBy(10)), TaskType.LAB);
        for (int i = 0; i < 2; i++) { // the second call must not add more
            DBManager.transaction(con -> { new GameService(con).ensureDailyQuests(p.userId(), NOW); return null; });
        }
        List<DailyQuest> qs = read(con -> new QuestDAO(con).findDaily(p.userId(), MnTime.dayKey(NOW), false));
        assertEquals(3, qs.size());
        Set<GoalType> types = new HashSet<>();
        for (DailyQuest q : qs) types.add(q.getTemplate().getGoalType());
        assertEquals(3, types.size());
        assertFalse(types.contains(GoalType.CLEAR_OVERDUE), "impossible quest assigned");
    }

    @Test
    void guildQuestRewardLeaderboardSuccessionAndDeletion() throws Exception {
        Player a = player();
        Player b = player();
        Player c = player();
        int guildId = DBManager.transaction(con -> {
            GuildDAO g = new GuildDAO(con);
            int id = g.create("G", "T" + System.nanoTime(), NOW);
            g.addMember(id, a.userId(), "LEADER", ago(HOUR.multipliedBy(3)));
            g.addMember(id, b.userId(), "MEMBER", ago(HOUR.multipliedBy(2)));
            g.addMember(id, c.userId(), "MEMBER", ago(HOUR)); // stays inactive
            g.insertQuest(id, "q", GoalType.COMPLETE_N, null, 3, MnTime.weekStartKey(NOW));
            return id;
        });
        for (Player who : List.of(a, a, b)) complete(who, task(who, NOW, ahead(DAY), TaskType.HOMEWORK), NOW);

        assertTrue(read(con -> new GuildDAO(con).findQuest(guildId, MnTime.weekStartKey(NOW))).isCompleted());
        int bonusA = read(con -> new XpLogDAO(con).sumBySource(a.userId(), XpSource.GUILD_QUEST));
        int bonusB = read(con -> new XpLogDAO(con).sumBySource(b.userId(), XpSource.GUILD_QUEST));
        int bonusC = read(con -> new XpLogDAO(con).sumBySource(c.userId(), XpSource.GUILD_QUEST));
        assertEquals(50, bonusA);
        assertEquals(50, bonusB);
        assertEquals(0, bonusC); // joined but finished nothing this week

        List<LeaderboardRow> board = read(con -> new GuildService(con).leaderboard(guildId, NOW));
        assertEquals(a.userId(), board.get(0).getUserId());
        assertEquals(100 + 10, board.get(0).getWeekXp()); // 2 tasks x 50 + "First step" achievement 10

        DBManager.transaction(con -> { new GuildService(con).removeMember(guildId, a.userId()); return null; });
        assertTrue(read(con -> new GuildDAO(con).findMembership(b.userId())).isLeader());
        DBManager.transaction(con -> {
            GuildService gs = new GuildService(con);
            gs.removeMember(guildId, b.userId());
            gs.removeMember(guildId, c.userId());
            return null;
        });
        assertNull(read(con -> new GuildDAO(con).find(guildId)));
    }

    @Test
    void finishingSomeoneElsesTaskIsRefused() throws Exception {
        Player owner = player();
        Player other = player();
        int t = task(owner, ago(DAY), ahead(DAY), TaskType.HOMEWORK);
        GameException e = null;
        try (Connection con = DBManager.getConnection()) {
            new GameService(con).completeTask(other.userId(), t, NOW);
        } catch (GameException ex) {
            e = ex;
        }
        assertEquals("Task not found.", e == null ? null : e.getMessage());
        Task stillOpen = read(con -> new TaskDAO(con).findOwned(t, owner.userId()));
        assertEquals(TaskStatus.TODO, stillOpen.getStatus());
    }
}
