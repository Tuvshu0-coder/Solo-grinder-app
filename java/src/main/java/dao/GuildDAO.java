// GuildDAO: guilds, their members and their weekly quest.
package dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import model.GoalType;
import model.Guild;
import model.GuildMember;
import model.GuildQuest;
import model.TaskType;

public class GuildDAO extends BaseDAO {

    private static final String GUILD = "SELECT g.*, (SELECT COUNT(*) FROM GuildMember m WHERE m.guildId = g.id) AS members FROM Guild g ";
    private static final String MEMBER = "SELECT gm.*, u.username, u.isSuspended FROM GuildMember gm JOIN User u ON u.id = gm.userId ";

    public GuildDAO(Connection con) {
        super(con);
    }

    // ---------- guilds ----------

    public Guild find(int id) throws SQLException {
        return guild(GUILD + "WHERE g.id = ?", id);
    }

    public Guild findByCode(String code) throws SQLException {
        return guild(GUILD + "WHERE g.inviteCode = ?", code);
    }

    public int create(String name, String inviteCode, Instant now) throws SQLException {
        return insert("INSERT INTO Guild (name, inviteCode, createdAt) VALUES (?, ?, ?)", name, inviteCode, now);
    }

    public void delete(int guildId) throws SQLException {
        update("DELETE FROM Guild WHERE id = ?", guildId);
    }

    public int countAll() throws SQLException {
        return (int) number("SELECT COUNT(*) FROM Guild");
    }

    // ---------- members ----------

    /** The user's membership, or null if they are not in a guild. */
    public GuildMember findMembership(int userId) throws SQLException {
        List<GuildMember> l = members(MEMBER + "WHERE gm.userId = ?", userId);
        return l.isEmpty() ? null : l.get(0);
    }

    /** Members, longest-standing first. */
    public List<GuildMember> findMembers(int guildId) throws SQLException {
        return members(MEMBER + "WHERE gm.guildId = ? ORDER BY gm.joinedAt", guildId);
    }

    public void addMember(int guildId, int userId, String role, Instant joinedAt) throws SQLException {
        update("INSERT INTO GuildMember (guildId, userId, role, joinedAt) VALUES (?, ?, ?, ?)", guildId, userId, role, joinedAt);
    }

    public void removeMember(int userId) throws SQLException {
        update("DELETE FROM GuildMember WHERE userId = ?", userId);
    }

    public void setRole(int userId, String role) throws SQLException {
        update("UPDATE GuildMember SET role = ? WHERE userId = ?", role, userId);
    }

    public void demoteLeaders(int guildId) throws SQLException {
        update("UPDATE GuildMember SET role = 'MEMBER' WHERE guildId = ? AND role = 'LEADER'", guildId);
    }

    public int countMembers(int guildId) throws SQLException {
        return (int) number("SELECT COUNT(*) FROM GuildMember WHERE guildId = ?", guildId);
    }

    // ---------- weekly guild quest ----------

    public GuildQuest findQuest(int guildId, String weekStart) throws SQLException {
        try (PreparedStatement ps = prepare("SELECT * FROM GuildQuest WHERE guildId = ? AND weekStart = ?", guildId, weekStart);
             ResultSet rs = ps.executeQuery()) {
            if (!rs.next()) return null;
            return new GuildQuest(rs.getInt("id"), rs.getString("title"), GoalType.parse(rs.getString("goalType")),
                    TaskType.parse(rs.getString("taskType")), rs.getInt("targetValue"), rs.getInt("progress"),
                    bool(rs, "isCompleted"));
        }
    }

    public void insertQuest(int guildId, String title, GoalType goal, TaskType taskType, int target, String weekStart)
            throws SQLException {
        update("INSERT INTO GuildQuest (guildId, title, goalType, taskType, targetValue, progress, weekStart, isCompleted) "
                + "VALUES (?, ?, ?, ?, ?, 0, ?, 0)", guildId, title, goal, taskType, target, weekStart);
    }

    public void updateQuest(int id, int progress, boolean completed) throws SQLException {
        update("UPDATE GuildQuest SET progress = ?, isCompleted = ? WHERE id = ?", progress, completed, id);
    }

    // ---------- row -> object ----------

    private Guild guild(String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = prepare(sql, params); ResultSet rs = ps.executeQuery()) {
            return rs.next()
                    ? new Guild(rs.getInt("id"), rs.getString("name"), rs.getString("inviteCode"), rs.getInt("members"))
                    : null;
        }
    }

    private List<GuildMember> members(String sql, Object... params) throws SQLException {
        List<GuildMember> list = new ArrayList<>();
        try (PreparedStatement ps = prepare(sql, params); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new GuildMember(rs.getInt("guildId"), rs.getInt("userId"), rs.getString("role"),
                        instant(rs, "joinedAt"), rs.getString("username"), bool(rs, "isSuspended")));
            }
        }
        return list;
    }
}
