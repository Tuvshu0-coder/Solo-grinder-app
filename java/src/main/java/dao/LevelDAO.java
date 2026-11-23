// LevelDAO: the Level table (row id = level number, minXp = total XP needed, rank letter).
package dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import model.Level;

public class LevelDAO extends BaseDAO {

    public LevelDAO(Connection con) {
        super(con);
    }

    public List<Level> findAll() throws SQLException {
        List<Level> list = new ArrayList<>();
        String sql = "SELECT l.*, (SELECT COUNT(*) FROM User u WHERE u.levelId = l.id) AS users FROM Level l ORDER BY l.id";
        try (PreparedStatement ps = prepare(sql); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) list.add(map(rs));
        }
        return list;
    }

    public Level find(int id) throws SQLException {
        String sql = "SELECT l.*, 0 AS users FROM Level l WHERE l.id = ?";
        try (PreparedStatement ps = prepare(sql, id); ResultSet rs = ps.executeQuery()) {
            return rs.next() ? map(rs) : null;
        }
    }

    /** The highest level whose threshold this much XP reaches (level 1 if none). */
    public int levelFor(int totalXp) throws SQLException {
        long id = number("SELECT id FROM Level WHERE minXp <= ? ORDER BY id DESC LIMIT 1", totalXp);
        return id > 0 ? (int) id : 1;
    }

    /** Insert a new level, or change an existing one. */
    public void save(int id, int minXp, String rank) throws SQLException {
        update("INSERT INTO Level (id, minXp, rank) VALUES (?, ?, ?) "
                + "ON CONFLICT(id) DO UPDATE SET minXp = excluded.minXp, rank = excluded.rank", id, minXp, rank);
    }

    /** Seed only: adds the level unless it already exists. */
    public void insertIfMissing(int id, int minXp, String rank) throws SQLException {
        update("INSERT OR IGNORE INTO Level (id, minXp, rank) VALUES (?, ?, ?)", id, minXp, rank);
    }

    private static Level map(ResultSet rs) throws SQLException {
        return new Level(rs.getInt("id"), rs.getInt("minXp"), rs.getString("rank"), rs.getInt("users"));
    }
}
