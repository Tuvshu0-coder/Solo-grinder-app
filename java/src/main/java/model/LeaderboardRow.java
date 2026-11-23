// One line of a guild's weekly leaderboard (rule 17).
package model;

import java.time.Instant;

public class LeaderboardRow {
    private final int userId;
    private final String username;
    private final String role;
    private final int weekXp;
    private final int earlyCount;
    private final int doneCount;
    private final Instant joinedAt;

    public LeaderboardRow(int userId, String username, String role, int weekXp, int earlyCount, int doneCount,
                          Instant joinedAt) {
        this.userId = userId;
        this.username = username;
        this.role = role;
        this.weekXp = weekXp;
        this.earlyCount = earlyCount;
        this.doneCount = doneCount;
        this.joinedAt = joinedAt;
    }

    public int getUserId() { return userId; }
    public String getUsername() { return username; }
    public String getRole() { return role; }
    public boolean isLeader() { return "LEADER".equals(role); }
    public int getWeekXp() { return weekXp; }
    public int getEarlyCount() { return earlyCount; }
    public int getDoneCount() { return doneCount; }
    public Instant getJoinedAt() { return joinedAt; }
}
