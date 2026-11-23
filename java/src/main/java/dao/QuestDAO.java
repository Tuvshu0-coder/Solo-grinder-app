// QuestDAO: quest templates (made by the admin) and the daily quests given to each student.
package dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import model.DailyQuest;
import model.GoalType;
import model.QuestTemplate;
import model.TaskType;

public class QuestDAO extends BaseDAO {

    public QuestDAO(Connection con) {
        super(con);
    }

    // ---------- templates ----------

    public List<QuestTemplate> findTemplates(boolean activeOnly) throws SQLException {
        String sql = "SELECT * FROM QuestTemplate" + (activeOnly ? " WHERE isActive = 1" : "") + " ORDER BY goalType, id";
        List<QuestTemplate> list = new ArrayList<>();
        try (PreparedStatement ps = prepare(sql); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) list.add(template(rs));
        }
        return list;
    }

    public QuestTemplate findTemplate(int id) throws SQLException {
        try (PreparedStatement ps = prepare("SELECT * FROM QuestTemplate WHERE id = ?", id); ResultSet rs = ps.executeQuery()) {
            return rs.next() ? template(rs) : null;
        }
    }

    public void insertTemplate(String title, GoalType goal, TaskType taskType, int target, int xp) throws SQLException {
        update("INSERT INTO QuestTemplate (title, goalType, taskType, targetValue, xpReward, isActive) VALUES (?, ?, ?, ?, ?, 1)",
                title, goal, taskType, target, xp);
    }

    public void updateTemplate(int id, String title, GoalType goal, TaskType taskType, int target, int xp) throws SQLException {
        update("UPDATE QuestTemplate SET title = ?, goalType = ?, taskType = ?, targetValue = ?, xpReward = ? WHERE id = ?",
                title, goal, taskType, target, xp, id);
    }

    public void setTemplateActive(int id, boolean active) throws SQLException {
        update("UPDATE QuestTemplate SET isActive = ? WHERE id = ?", active, id);
    }

    public int countTemplates() throws SQLException {
        return (int) number("SELECT COUNT(*) FROM QuestTemplate");
    }

    // ---------- daily quests ----------

    public int countDaily(int userId, String day) throws SQLException {
        return (int) number("SELECT COUNT(*) FROM DailyQuest WHERE userId = ? AND questDate = ?", userId, day);
    }

    public void insertDaily(int userId, int templateId, String day) throws SQLException {
        update("INSERT INTO DailyQuest (userId, templateId, questDate, progress, isCompleted) VALUES (?, ?, ?, 0, 0)",
                userId, templateId, day);
    }

    /** That day's quests with their templates; openOnly = only the ones not finished yet. */
    public List<DailyQuest> findDaily(int userId, String day, boolean openOnly) throws SQLException {
        String sql = "SELECT d.id AS d_id, d.questDate, d.progress, d.isCompleted, q.* FROM DailyQuest d "
                + "JOIN QuestTemplate q ON q.id = d.templateId WHERE d.userId = ? AND d.questDate = ?"
                + (openOnly ? " AND d.isCompleted = 0" : "") + " ORDER BY d.id";
        List<DailyQuest> list = new ArrayList<>();
        try (PreparedStatement ps = prepare(sql, userId, day); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new DailyQuest(rs.getInt("d_id"), rs.getString("questDate"), rs.getInt("progress"),
                        bool(rs, "isCompleted"), template(rs)));
            }
        }
        return list;
    }

    public void updateDaily(int id, int progress, boolean completed) throws SQLException {
        update("UPDATE DailyQuest SET progress = ?, isCompleted = ? WHERE id = ?", progress, completed, id);
    }

    private static QuestTemplate template(ResultSet rs) throws SQLException {
        return new QuestTemplate(rs.getInt("id"), rs.getString("title"), GoalType.parse(rs.getString("goalType")),
                TaskType.parse(rs.getString("taskType")), rs.getInt("targetValue"), rs.getInt("xpReward"),
                bool(rs, "isActive"));
    }
}
