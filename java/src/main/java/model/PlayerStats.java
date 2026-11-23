// The numbers achievements are checked against.
package model;

public class PlayerStats {
    private final int streak;
    private final int tasksDone;
    private final int earlyTasks;
    private final int level;

    public PlayerStats(int streak, int tasksDone, int earlyTasks, int level) {
        this.streak = streak;
        this.tasksDone = tasksDone;
        this.earlyTasks = earlyTasks;
        this.level = level;
    }

    public int getStreak() { return streak; }
    public int getTasksDone() { return tasksDone; }
    public int getEarlyTasks() { return earlyTasks; }
    public int getLevel() { return level; }
}
