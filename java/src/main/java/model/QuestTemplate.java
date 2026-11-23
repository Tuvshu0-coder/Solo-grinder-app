// QuestTemplate = a daily quest the admin defines. Each day every student gets 3 of them (rule 11).
package model;

public class QuestTemplate {
    private final int id;
    private final String title;
    private final GoalType goalType;
    private final TaskType taskType; // only for COMPLETE_TYPE, else null
    private final int targetValue;
    private final int xpReward;
    private final boolean active;

    public QuestTemplate(int id, String title, GoalType goalType, TaskType taskType, int targetValue,
                         int xpReward, boolean active) {
        this.id = id;
        this.title = title;
        this.goalType = goalType;
        this.taskType = taskType;
        this.targetValue = targetValue;
        this.xpReward = xpReward;
        this.active = active;
    }

    /** The rule object for this quest (see QuestGoal). */
    public QuestGoal getGoal() {
        return goalType.goal(taskType);
    }

    public int getId() { return id; }
    public String getTitle() { return title; }
    public GoalType getGoalType() { return goalType; }
    public TaskType getTaskType() { return taskType; }
    public int getTargetValue() { return targetValue; }
    public int getXpReward() { return xpReward; }
    public boolean isActive() { return active; }
}
