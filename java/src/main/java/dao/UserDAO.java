// UserDAO: everything about the User table (and the session lookup, which returns a User).
package dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import model.User;

public class UserDAO extends BaseDAO {

    // Every User query joins its Level row so the rank letter comes along.
    private static final String SELECT = "SELECT u.*, l.rank AS rank FROM User u LEFT JOIN Level l ON l.id = u.levelId ";

    public UserDAO(Connection con) {
        super(con);
    }

    public User findById(int id) throws SQLException {
        return one(SELECT + "WHERE u.id = ?", id);
    }

    public User findByUsername(String username) throws SQLException {
        return one(SELECT + "WHERE u.username = ?", username);
    }

    /** The logged-in user for a session id, or null if the session is unknown, expired or the user is suspended. */
    public User findBySession(String sessionId, Instant now) throws SQLException {
        return one("SELECT u.*, l.rank AS rank FROM Session s JOIN User u ON u.id = s.userId "
                + "LEFT JOIN Level l ON l.id = u.levelId WHERE s.id = ? AND s.expiresAt >= ? AND u.isSuspended = 0",
                sessionId, now);
    }

    public int insert(String username, String passwordHash, String role, Instant now) throws SQLException {
        return insert("INSERT INTO User (username, password, role, levelId, totalXp, streak, isSuspended, createdAt) "
                + "VALUES (?, ?, ?, 1, 0, 0, 0, ?)", username, passwordHash, role, now);
    }

    public void addXp(int userId, int amount) throws SQLException {
        update("UPDATE User SET totalXp = totalXp + ? WHERE id = ?", amount, userId);
    }

    public void setLevel(int userId, int levelId) throws SQLException {
        update("UPDATE User SET levelId = ? WHERE id = ?", levelId, userId);
    }

    /** After the admin edits levels: every user gets the highest level their XP reaches. */
    public void recomputeAllLevels() throws SQLException {
        update("UPDATE User SET levelId = COALESCE((SELECT l.id FROM Level l WHERE l.minXp <= User.totalXp "
                + "ORDER BY l.id DESC LIMIT 1), 1)");
    }

    public void setStreak(int userId, int streak, String lastActiveDate) throws SQLException {
        update("UPDATE User SET streak = ?, lastActiveDate = ? WHERE id = ?", streak, lastActiveDate, userId);
    }

    /** Rule 12: anyone who skipped a whole day loses their streak. Day keys compare correctly as text. */
    public void resetBrokenStreaks(String yesterday) throws SQLException {
        update("UPDATE User SET streak = 0 WHERE streak > 0 AND (lastActiveDate IS NULL OR lastActiveDate < ?)", yesterday);
    }

    public void setGuildLeftAt(int userId, Instant at) throws SQLException {
        update("UPDATE User SET guildLeftAt = ? WHERE id = ?", at, userId);
    }

    public void setSuspended(int userId, boolean suspended) throws SQLException {
        update("UPDATE User SET isSuspended = ? WHERE id = ?", suspended, userId);
    }

    /** Admin list: students whose name contains `query`, most XP first, with their guild name. */
    public List<User> findStudents(String query) throws SQLException {
        // Escape % and _ so they are searched literally, not used as LIKE wildcards.
        String like = "%" + query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
        String sql = "SELECT u.*, l.rank AS rank, g.name AS guildName FROM User u "
                + "LEFT JOIN Level l ON l.id = u.levelId "
                + "LEFT JOIN GuildMember gm ON gm.userId = u.id LEFT JOIN Guild g ON g.id = gm.guildId "
                + "WHERE u.role = 'STUDENT' AND u.username LIKE ? ESCAPE '\\' ORDER BY u.totalXp DESC LIMIT 200";
        List<User> list = new ArrayList<>();
        try (PreparedStatement ps = prepare(sql, like); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                User u = map(rs);
                u.setGuildName(rs.getString("guildName"));
                list.add(u);
            }
        }
        return list;
    }

    public int countStudents(boolean suspendedOnly) throws SQLException {
        return (int) number("SELECT COUNT(*) FROM User WHERE role = 'STUDENT'" + (suspendedOnly ? " AND isSuspended = 1" : ""));
    }

    // ---------- sessions (30-day login cookie) ----------

    public void insertSession(String id, int userId, Instant expiresAt) throws SQLException {
        update("INSERT INTO Session (id, userId, expiresAt) VALUES (?, ?, ?)", id, userId, expiresAt);
    }

    public void deleteSession(String id) throws SQLException {
        update("DELETE FROM Session WHERE id = ?", id);
    }

    public void deleteSessionsOf(int userId) throws SQLException {
        update("DELETE FROM Session WHERE userId = ?", userId);
    }

    // ---------- row -> object ----------

    private User one(String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = prepare(sql, params); ResultSet rs = ps.executeQuery()) {
            return rs.next() ? map(rs) : null;
        }
    }

    private static User map(ResultSet rs) throws SQLException {
        return new User(rs.getInt("id"), rs.getString("username"), rs.getString("password"), rs.getString("role"),
                rs.getInt("levelId"), rs.getString("rank"), rs.getInt("totalXp"), rs.getInt("streak"),
                rs.getString("lastActiveDate"), instant(rs, "guildLeftAt"), bool(rs, "isSuspended"),
                instant(rs, "createdAt"));
    }
}
