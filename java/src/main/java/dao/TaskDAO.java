// TaskDAO: tasks. A task belongs to a subject, and the subject to a user, so "the user's tasks"
// always joins Subject and checks s.userId.
package dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import model.OpenTasks;
import model.Task;
import model.TaskStatus;
import model.TaskType;

public class TaskDAO extends BaseDAO {

    private static final String SELECT = "SELECT t.*, s.name AS subjectName FROM Task t JOIN Subject s ON s.id = t.subjectId ";

    public TaskDAO(Connection con) {
        super(con);
    }

    /** Not-done tasks, nearest deadline first. */
    public List<Task> findOpen(int userId, int limit) throws SQLException {
        return list(SELECT + "WHERE s.userId = ? AND t.status IN ('TODO', 'LATE') ORDER BY t.deadline LIMIT ?", userId, limit);
    }

    /** Tasks page: "open" = to do and late, "done" = newest finished first, "all" = everything by deadline. */
    public List<Task> findForList(int userId, String filter) throws SQLException {
        return switch (filter) {
            case "done" -> list(SELECT + "WHERE s.userId = ? AND t.status = 'DONE' ORDER BY t.completedAt DESC", userId);
            case "all" -> list(SELECT + "WHERE s.userId = ? ORDER BY t.deadline", userId);
            default -> list(SELECT + "WHERE s.userId = ? AND t.status IN ('TODO', 'LATE') ORDER BY t.deadline", userId);
        };
    }

    public Map<TaskStatus, Integer> countByStatus(int userId) throws SQLException {
        Map<TaskStatus, Integer> counts = new EnumMap<>(TaskStatus.class);
        for (TaskStatus st : TaskStatus.values()) counts.put(st, 0);
        String sql = "SELECT t.status, COUNT(*) FROM Task t JOIN Subject s ON s.id = t.subjectId WHERE s.userId = ? GROUP BY t.status";
        try (PreparedStatement ps = prepare(sql, userId); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) counts.put(TaskStatus.valueOf(rs.getString(1)), rs.getInt(2));
        }
        return counts;
    }

    /** The task only if it belongs to this user, else null. */
    public Task findOwned(int taskId, int userId) throws SQLException {
        List<Task> l = list(SELECT + "WHERE t.id = ? AND s.userId = ?", taskId, userId);
        return l.isEmpty() ? null : l.get(0);
    }

    public void insert(int subjectId, String title, TaskType type, Instant deadline, Instant now) throws SQLException {
        update("INSERT INTO Task (subjectId, title, type, deadline, createdAt, status, xpEarned, deadlineEdited) "
                + "VALUES (?, ?, ?, ?, ?, 'TODO', 0, 0)", subjectId, title, type, deadline, now);
    }

    /** Rule 10: tasks past their deadline become LATE. */
    public void markOverdueLate(Instant now) throws SQLException {
        update("UPDATE Task SET status = 'LATE' WHERE status = 'TODO' AND deadline < ?", now);
    }

    public void complete(int id, Instant at, double multiplier, int xpEarned) throws SQLException {
        update("UPDATE Task SET status = 'DONE', completedAt = ?, multiplier = ?, xpEarned = ? WHERE id = ?",
                at, multiplier, xpEarned, id);
    }

    public void changeDeadline(int id, Instant deadline) throws SQLException {
        update("UPDATE Task SET deadline = ?, deadlineEdited = 1 WHERE id = ?", deadline, id);
    }

    /** Only the owner's unfinished tasks can be deleted. */
    public void deleteOpen(int id, int userId) throws SQLException {
        update("DELETE FROM Task WHERE id = ? AND status <> 'DONE' AND subjectId IN (SELECT id FROM Subject WHERE userId = ?)",
                id, userId);
    }

    /** Finished tasks, optionally only since an instant and/or only early ones (multiplier > 1). */
    public int countDone(int userId, Instant since, boolean earlyOnly) throws SQLException {
        String sql = "SELECT COUNT(*) FROM Task t JOIN Subject s ON s.id = t.subjectId WHERE s.userId = ? AND t.status = 'DONE'"
                + (since != null ? " AND t.completedAt >= ?" : "")
                + (earlyOnly ? " AND t.multiplier > 1" : "");
        return (int) (since != null ? number(sql, userId, since) : number(sql, userId));
    }

    /** Multipliers of every finished task (null if somehow missing), for the dashboard's timing stats. */
    public List<Double> doneMultipliers(int userId) throws SQLException {
        String sql = "SELECT t.multiplier FROM Task t JOIN Subject s ON s.id = t.subjectId WHERE s.userId = ? AND t.status = 'DONE'";
        List<Double> list = new ArrayList<>();
        try (PreparedStatement ps = prepare(sql, userId); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) list.add(nullableDouble(rs, "multiplier"));
        }
        return list;
    }

    /** What is still open, for picking possible daily quests. */
    public OpenTasks openTasks(int userId) throws SQLException {
        OpenTasks open = new OpenTasks();
        String sql = "SELECT t.type, t.status FROM Task t JOIN Subject s ON s.id = t.subjectId "
                + "WHERE s.userId = ? AND t.status IN ('TODO', 'LATE')";
        try (PreparedStatement ps = prepare(sql, userId); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) open.add(TaskType.parse(rs.getString(1)), TaskStatus.valueOf(rs.getString(2)));
        }
        return open;
    }

    // ---------- admin statistics ----------

    public int countWithStatus(TaskStatus status) throws SQLException {
        return (int) number("SELECT COUNT(*) FROM Task WHERE status = ?", status);
    }

    public int countDoneSince(Instant since) throws SQLException {
        return (int) number("SELECT COUNT(*) FROM Task WHERE status = 'DONE' AND completedAt >= ?", since);
    }

    // ---------- row -> object ----------

    private List<Task> list(String sql, Object... params) throws SQLException {
        List<Task> list = new ArrayList<>();
        try (PreparedStatement ps = prepare(sql, params); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new Task(rs.getInt("id"), rs.getInt("subjectId"), rs.getString("subjectName"),
                        rs.getString("title"), TaskType.parse(rs.getString("type")), instant(rs, "deadline"),
                        instant(rs, "createdAt"), instant(rs, "completedAt"), TaskStatus.valueOf(rs.getString("status")),
                        nullableDouble(rs, "multiplier"), rs.getInt("xpEarned"), bool(rs, "deadlineEdited")));
            }
        }
        return list;
    }
}
