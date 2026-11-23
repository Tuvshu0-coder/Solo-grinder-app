// DbSetup: makes sure the database is ready when the app starts.
//  - empty database file -> create the tables from src/main/resources/schema.sql
//  - then add the starting data if it is missing: levels 1-60, daily quest templates,
//    achievements and the admin account (admin / admin123).
// Running it on an existing database changes nothing that is already there.
package service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;

import org.mindrot.jbcrypt.BCrypt;

import dao.AchievementDAO;
import dao.LevelDAO;
import dao.QuestDAO;
import dao.UserDAO;
import model.ConditionType;
import model.GoalType;
import model.TaskType;
import util.DBManager;
import util.Rules;

public final class DbSetup {

    private DbSetup() {}

    public static void ensure() throws SQLException, IOException {
        try (Connection con = DBManager.getConnection()) {
            if (!tableExists(con, "Level")) createTables(con);
        }
        DBManager.transaction(con -> {
            seed(con);
            return null;
        });
    }

    private static boolean tableExists(Connection con, String name) throws SQLException {
        try (ResultSet rs = con.getMetaData().getTables(null, null, name, null)) {
            return rs.next();
        }
    }

    private static void createTables(Connection con) throws SQLException, IOException {
        String sql;
        try (InputStream in = DbSetup.class.getResourceAsStream("/schema.sql")) {
            if (in == null) throw new IOException("schema.sql is missing from the classpath");
            sql = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
        try (Statement st = con.createStatement()) {
            for (String part : sql.split(";")) {
                String stmt = part.lines().filter(l -> !l.trim().startsWith("--")).reduce("", (a, b) -> a + "\n" + b).trim();
                if (!stmt.isEmpty()) st.executeUpdate(stmt);
            }
        }
    }

    private static void seed(Connection con) throws SQLException {
        LevelDAO levels = new LevelDAO(con);
        for (int id = 1; id <= 60; id++) levels.insertIfMissing(id, Rules.defaultMinXp(id), Rules.rankForLevel(id)); // rule 21

        QuestDAO quests = new QuestDAO(con);
        if (quests.countTemplates() == 0) {
            quests.insertTemplate("Finish 2 tasks today", GoalType.COMPLETE_N, null, 2, 20);
            quests.insertTemplate("Finish 1 task today", GoalType.COMPLETE_N, null, 1, 20);
            quests.insertTemplate("Finish 1 task at ×1.2 or better", GoalType.COMPLETE_EARLY, null, 1, 30);
            quests.insertTemplate("Finish 1 late task", GoalType.CLEAR_OVERDUE, null, 1, 20);
            for (TaskType t : TaskType.values()) {
                quests.insertTemplate("Finish 1 \"" + t.getLabel() + "\" task", GoalType.COMPLETE_TYPE, t, 1, 20);
            }
        }

        AchievementDAO achievements = new AchievementDAO(con);
        if (achievements.count() == 0) {
            achievements.insert("Getting started", "3-day streak", ConditionType.STREAK, 3, 20);
            achievements.insert("One week", "7-day streak", ConditionType.STREAK, 7, 50);
            achievements.insert("Two weeks", "14-day streak", ConditionType.STREAK, 14, 100);
            achievements.insert("Month of grit", "30-day streak", ConditionType.STREAK, 30, 200);
            achievements.insert("First step", "Finish your first task", ConditionType.TASKS_DONE, 1, 10);
            achievements.insert("Hard worker", "Finish 50 tasks", ConditionType.TASKS_DONE, 50, 100);
            achievements.insert("Early bird", "Finish 10 tasks early", ConditionType.EARLY_TASKS, 10, 50);
            achievements.insert("D rank", "Reach level 10", ConditionType.LEVEL, 10, 50);
        }

        UserDAO users = new UserDAO(con);
        if (users.findByUsername("admin") == null) {
            users.insert("admin", BCrypt.hashpw("admin123", BCrypt.gensalt(10)), "ADMIN", Instant.now());
        }
    }
}
