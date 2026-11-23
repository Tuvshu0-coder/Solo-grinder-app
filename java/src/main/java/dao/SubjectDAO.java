// SubjectDAO: a student's subjects. Every query includes userId, so nobody can touch someone else's.
package dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import model.Subject;

public class SubjectDAO extends BaseDAO {

    public SubjectDAO(Connection con) {
        super(con);
    }

    /** The student's subjects A to Z, each with how many tasks it has, how many are done and late. */
    public List<Subject> findByUser(int userId) throws SQLException {
        String sql = "SELECT s.id, s.name, COUNT(t.id) AS total, "
                + "COALESCE(SUM(t.status = 'DONE'), 0) AS done, COALESCE(SUM(t.status = 'LATE'), 0) AS late "
                + "FROM Subject s LEFT JOIN Task t ON t.subjectId = s.id "
                + "WHERE s.userId = ? GROUP BY s.id ORDER BY s.name";
        List<Subject> list = new ArrayList<>();
        try (PreparedStatement ps = prepare(sql, userId); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new Subject(rs.getInt("id"), rs.getString("name"), rs.getInt("total"),
                        rs.getInt("done"), rs.getInt("late")));
            }
        }
        return list;
    }

    public boolean isOwnedBy(int subjectId, int userId) throws SQLException {
        return number("SELECT COUNT(*) FROM Subject WHERE id = ? AND userId = ?", subjectId, userId) > 0;
    }

    public void insert(int userId, String name) throws SQLException {
        update("INSERT INTO Subject (userId, name) VALUES (?, ?)", userId, name);
    }

    public void rename(int id, int userId, String name) throws SQLException {
        update("UPDATE Subject SET name = ? WHERE id = ? AND userId = ?", name, id, userId);
    }

    /** Its tasks are deleted too (ON DELETE CASCADE). XP already earned stays in XpLog. */
    public void delete(int id, int userId) throws SQLException {
        update("DELETE FROM Subject WHERE id = ? AND userId = ?", id, userId);
    }
}
