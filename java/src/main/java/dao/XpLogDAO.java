// XpLogDAO: XP history. Every XP change is one row, so "XP today" or "XP this week" is a SUM.
package dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import model.XpLog;
import model.XpSource;

public class XpLogDAO extends BaseDAO {

    public XpLogDAO(Connection con) {
        super(con);
    }

    public void insert(int userId, XpSource source, Integer sourceId, int amount, Instant at) throws SQLException {
        update("INSERT INTO XpLog (userId, source, sourceId, xpAmount, createdAt) VALUES (?, ?, ?, ?, ?)",
                userId, source, sourceId, amount, at);
    }

    public int sumSince(int userId, Instant since) throws SQLException {
        return (int) number("SELECT COALESCE(SUM(xpAmount), 0) FROM XpLog WHERE userId = ? AND createdAt >= ?", userId, since);
    }

    /** Weekly guild XP leaves out the guild quest bonus itself (rule 17). */
    public int sumSinceExcluding(int userId, Instant since, XpSource excluded) throws SQLException {
        return (int) number("SELECT COALESCE(SUM(xpAmount), 0) FROM XpLog WHERE userId = ? AND createdAt >= ? AND source <> ?",
                userId, since, excluded);
    }

    public int sumBySource(int userId, XpSource source) throws SQLException {
        return (int) number("SELECT COALESCE(SUM(xpAmount), 0) FROM XpLog WHERE userId = ? AND source = ?", userId, source);
    }

    public List<XpLog> findSince(int userId, Instant since) throws SQLException {
        return list("SELECT * FROM XpLog WHERE userId = ? AND createdAt >= ? ORDER BY createdAt", userId, since);
    }

    public List<XpLog> recent(int userId, int limit) throws SQLException {
        return list("SELECT * FROM XpLog WHERE userId = ? ORDER BY createdAt DESC LIMIT ?", userId, limit);
    }

    // ---------- admin statistics ----------

    public long sumAll() throws SQLException {
        return number("SELECT COALESCE(SUM(xpAmount), 0) FROM XpLog");
    }

    /** Students who finished at least one task since then. */
    public int countActiveUsersSince(Instant since) throws SQLException {
        return (int) number("SELECT COUNT(DISTINCT userId) FROM XpLog WHERE createdAt >= ? AND source = 'TASK'", since);
    }

    private List<XpLog> list(String sql, Object... params) throws SQLException {
        List<XpLog> list = new ArrayList<>();
        try (PreparedStatement ps = prepare(sql, params); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new XpLog(rs.getInt("id"), XpSource.valueOf(rs.getString("source")), rs.getInt("xpAmount"),
                        instant(rs, "createdAt")));
            }
        }
        return list;
    }
}
