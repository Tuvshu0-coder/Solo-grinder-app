// User = one row of the "User" table, plus the rank and guild name joined in for display.
package model;

import java.time.Instant;

public class User {
    private final int id;
    private final String username;
    private final String passwordHash; // bcrypt; never shown anywhere
    private final String role;         // "STUDENT" or "ADMIN"
    private final int levelId;
    private final String rank;         // from the Level table: E, D, C, B, A, S
    private final int totalXp;
    private final int streak;
    private final String lastActiveDate; // Mongolia day of the last on-time finish
    private final Instant guildLeftAt;   // for the 7-day guild cooldown
    private final boolean suspended;
    private final Instant createdAt;
    private String guildName;            // only filled on the admin user list

    public User(int id, String username, String passwordHash, String role, int levelId, String rank,
                int totalXp, int streak, String lastActiveDate, Instant guildLeftAt, boolean suspended,
                Instant createdAt) {
        this.id = id;
        this.username = username;
        this.passwordHash = passwordHash;
        this.role = role;
        this.levelId = levelId;
        this.rank = rank;
        this.totalXp = totalXp;
        this.streak = streak;
        this.lastActiveDate = lastActiveDate;
        this.guildLeftAt = guildLeftAt;
        this.suspended = suspended;
        this.createdAt = createdAt;
    }

    public int getId() { return id; }
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public String getRole() { return role; }
    public boolean isAdmin() { return "ADMIN".equals(role); }
    public int getLevelId() { return levelId; }
    public String getRank() { return rank; }
    public int getTotalXp() { return totalXp; }
    public int getStreak() { return streak; }
    public String getLastActiveDate() { return lastActiveDate; }
    public Instant getGuildLeftAt() { return guildLeftAt; }
    public boolean isSuspended() { return suspended; }
    public Instant getCreatedAt() { return createdAt; }
    public String getGuildName() { return guildName; }
    public void setGuildName(String guildName) { this.guildName = guildName; }
}
