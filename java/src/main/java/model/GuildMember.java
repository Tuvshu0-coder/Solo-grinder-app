// GuildMember = one student in one guild. A student can be in at most one guild (rule 15).
package model;

import java.time.Instant;

public class GuildMember {
    private final int guildId;
    private final int userId;
    private final String role; // "LEADER" or "MEMBER"
    private final Instant joinedAt;
    private final String username;
    private final boolean suspended;

    public GuildMember(int guildId, int userId, String role, Instant joinedAt, String username, boolean suspended) {
        this.guildId = guildId;
        this.userId = userId;
        this.role = role;
        this.joinedAt = joinedAt;
        this.username = username;
        this.suspended = suspended;
    }

    public int getGuildId() { return guildId; }
    public int getUserId() { return userId; }
    public String getRole() { return role; }
    public boolean isLeader() { return "LEADER".equals(role); }
    public Instant getJoinedAt() { return joinedAt; }
    public String getUsername() { return username; }
    public boolean isSuspended() { return suspended; }
}
