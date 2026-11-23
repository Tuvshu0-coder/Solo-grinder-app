// GuildService: guild rules that need more than one query (leaving, leadership, leaderboard).
package service;

import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;

import dao.GuildDAO;
import dao.TaskDAO;
import dao.XpLogDAO;
import model.GuildMember;
import model.LeaderboardRow;
import model.XpSource;
import util.MnTime;

public class GuildService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final GuildDAO guilds;
    private final TaskDAO tasks;
    private final XpLogDAO xp;

    public GuildService(Connection con) {
        guilds = new GuildDAO(con);
        tasks = new TaskDAO(con);
        xp = new XpLogDAO(con);
    }

    /** 8 random hex characters, e.g. "3FA9C21B". */
    public static String newInviteCode() {
        byte[] b = new byte[4];
        RANDOM.nextBytes(b);
        return HexFormat.of().withUpperCase().formatHex(b);
    }

    /**
     * Takes a member out. If they led the guild, the longest-standing member leads next (rule 20);
     * if they were the last member, the guild is deleted.
     */
    public void removeMember(int guildId, int userId) throws SQLException {
        GuildMember member = guilds.findMembership(userId);
        if (member == null || member.getGuildId() != guildId) return;
        guilds.removeMember(userId);
        if (guilds.countMembers(guildId) == 0) {
            guilds.delete(guildId);
            return;
        }
        if (member.isLeader()) promoteOldest(guildId, userId);
    }

    /** Gives leadership to the longest-standing member who isn't suspended (other than excludeUserId). */
    public void promoteOldest(int guildId, int excludeUserId) throws SQLException {
        for (GuildMember m : guilds.findMembers(guildId)) { // already oldest first
            if (m.getUserId() == excludeUserId || m.isSuspended()) continue;
            guilds.demoteLeaders(guildId);
            guilds.setRole(m.getUserId(), "LEADER");
            return;
        }
    }

    /**
     * Rule 17: XP earned this week while in the guild, without the guild quest bonus.
     * Ties: more early finishes first, then whoever joined earlier. Suspended users are hidden.
     */
    public List<LeaderboardRow> leaderboard(int guildId, Instant now) throws SQLException {
        Instant weekStart = MnTime.dayStart(MnTime.weekStartKey(now));
        List<LeaderboardRow> rows = new ArrayList<>();
        for (GuildMember m : guilds.findMembers(guildId)) {
            if (m.isSuspended()) continue;
            Instant since = m.getJoinedAt().isAfter(weekStart) ? m.getJoinedAt() : weekStart;
            rows.add(new LeaderboardRow(m.getUserId(), m.getUsername(), m.getRole(),
                    xp.sumSinceExcluding(m.getUserId(), since, XpSource.GUILD_QUEST),
                    tasks.countDone(m.getUserId(), since, true),
                    tasks.countDone(m.getUserId(), since, false),
                    m.getJoinedAt()));
        }
        rows.sort(Comparator.comparingInt(LeaderboardRow::getWeekXp).reversed()
                .thenComparing(Comparator.comparingInt(LeaderboardRow::getEarlyCount).reversed())
                .thenComparing(LeaderboardRow::getJoinedAt));
        return rows;
    }
}
