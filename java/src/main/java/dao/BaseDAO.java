// BaseDAO: the parent of every DAO. Holds the shared Connection and the small helpers every
// DAO needs, so each child DAO only contains its own SQL (INHERITANCE).
//
// Every query uses PreparedStatement with "?" placeholders: values are sent separately from the
// SQL text, which prevents SQL injection. try-with-resources closes statements automatically.
package dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.time.Instant;

public abstract class BaseDAO {

    protected final Connection con;

    protected BaseDAO(Connection con) {
        this.con = con;
    }

    /** Fills the "?" placeholders. Dates are stored as epoch milliseconds and booleans as 0/1. */
    protected PreparedStatement prepare(String sql, Object... params) throws SQLException {
        return bind(con.prepareStatement(sql), params);
    }

    private static PreparedStatement bind(PreparedStatement ps, Object... params) throws SQLException {
        for (int i = 0; i < params.length; i++) {
            Object p = params[i];
            int n = i + 1;
            if (p == null) ps.setNull(n, Types.NULL);
            else if (p instanceof Instant t) ps.setLong(n, t.toEpochMilli());
            else if (p instanceof Boolean b) ps.setInt(n, b ? 1 : 0);
            else if (p instanceof Enum<?> e) ps.setString(n, e.name());
            else ps.setObject(n, p);
        }
        return ps;
    }

    /** INSERT / UPDATE / DELETE. Returns how many rows changed. */
    protected int update(String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = prepare(sql, params)) {
            return ps.executeUpdate();
        }
    }

    /** INSERT that returns the new row's id. */
    protected int insert(String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = bind(con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS), params)) {
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                return keys.next() ? keys.getInt(1) : 0;
            }
        }
    }

    /** A query that returns one number (COUNT, SUM ...). NULL counts as 0. */
    protected long number(String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = prepare(sql, params); ResultSet rs = ps.executeQuery()) {
            return rs.next() ? rs.getLong(1) : 0;
        }
    }

    protected static Instant instant(ResultSet rs, String column) throws SQLException {
        long ms = rs.getLong(column);
        return rs.wasNull() ? null : Instant.ofEpochMilli(ms);
    }

    protected static Double nullableDouble(ResultSet rs, String column) throws SQLException {
        double d = rs.getDouble(column);
        return rs.wasNull() ? null : d;
    }

    protected static boolean bool(ResultSet rs, String column) throws SQLException {
        return rs.getInt(column) != 0;
    }
}
