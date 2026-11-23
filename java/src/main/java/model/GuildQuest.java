// GuildQuest = the one shared goal a guild leader sets for the week (rules 18-19).
package model;

public class GuildQuest {
    private final int id;
    private final String title;
    private final GoalType goalType;
    private final TaskType taskType;
    private final int targetValue;
    private final int progress;
    private final boolean completed;

    public GuildQuest(int id, String title, GoalType goalType, TaskType taskType, int targetValue,
                      int progress, boolean completed) {
        this.id = id;
        this.title = title;
        this.goalType = goalType;
        this.taskType = taskType;
        this.targetValue = targetValue;
        this.progress = progress;
        this.completed = completed;
    }

    /** The same QuestGoal classes as daily quests decide what counts. */
    public QuestGoal getGoal() {
        return goalType.goal(taskType);
    }

    public int getId() { return id; }
    public String getTitle() { return title; }
    public int getTargetValue() { return targetValue; }
    public int getProgress() { return progress; }
    public boolean isCompleted() { return completed; }
}
