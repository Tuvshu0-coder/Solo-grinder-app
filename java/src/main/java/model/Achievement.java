// Achievement = a one-time reward for reaching a threshold (rule 14).
package model;

public class Achievement {
    private final int id;
    private final String name;
    private final String description;
    private final ConditionType conditionType;
    private final int threshold;
    private final int xpReward;
    private final int userCount; // how many users have it (admin page)

    public Achievement(int id, String name, String description, ConditionType conditionType,
                       int threshold, int xpReward, int userCount) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.conditionType = conditionType;
        this.threshold = threshold;
        this.xpReward = xpReward;
        this.userCount = userCount;
    }

    /** Has this player reached the threshold? */
    public boolean isReachedBy(PlayerStats stats) {
        return conditionType != null && conditionType.valueOf(stats) >= threshold;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public ConditionType getConditionType() { return conditionType; }
    public int getThreshold() { return threshold; }
    public int getXpReward() { return xpReward; }
    public int getUserCount() { return userCount; }
}
