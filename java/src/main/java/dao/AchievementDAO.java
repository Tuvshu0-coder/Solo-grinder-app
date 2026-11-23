// AchievementDAO: achievements and which users have unlocked them.
package dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import model.Achievement;
import model.ConditionType;

public class AchievementDAO extends BaseDAO {

    public AchievementDAO(Connection con) {
        super(con);
    }

    /** All achievements grouped by condition, easiest first, each with how many users have it. */
    public List<Achievement> findAll() throws SQLException {
        String sql = "SELECT a.*, (SELECT COUNT(*) FROM UserAchievement ua WHERE ua.achievementId = a.id) AS users "
                + "FROM Achievement a ORDER BY a.conditionType, a.threshold";
        List<Achievement> list = new ArrayList<>();
        try (PreparedStatement ps = prepare(sql); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new Achievement(rs.getInt("id"), rs.getString("name"), rs.getString("description"),
                        ConditionType.parse(rs.getString("conditionType")), rs.getInt("threshold"),
                        rs.getInt("xpReward"), rs.getInt("users")));
            }
        }
        return list;
    }

    /** achievement id -> when this user unlocked it. */
    public Map<Integer, Instant> unlockedBy(int userId) throws SQLException {
        Map<Integer, Instant> map = new HashMap<>();
        try (PreparedStatement ps = prepare("SELECT achievementId, unlockedAt FROM UserAchievement WHERE userId = ?", userId);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) map.put(rs.getInt("achievementId"), instant(rs, "unlockedAt"));
        }
        return map;
    }

    public void unlock(int userId, int achievementId, Instant at) throws SQLException {
        update("INSERT INTO UserAchievement (userId, achievementId, unlockedAt) VALUES (?, ?, ?)", userId, achievementId, at);
    }

    public void insert(String name, String description, ConditionType type, int threshold, int xp) throws SQLException {
        update("INSERT INTO Achievement (name, description, conditionType, threshold, xpReward) VALUES (?, ?, ?, ?, ?)",
                name, description, type, threshold, xp);
    }

    public void update(int id, String name, String description, ConditionType type, int threshold, int xp) throws SQLException {
        update("UPDATE Achievement SET name = ?, description = ?, conditionType = ?, threshold = ?, xpReward = ? WHERE id = ?",
                name, description, type, threshold, xp, id);
    }

    public int count() throws SQLException {
        return (int) number("SELECT COUNT(*) FROM Achievement");
    }
}
