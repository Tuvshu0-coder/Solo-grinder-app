// The four kinds of quest goal, as stored in the database and shown in forms.
// goal(...) turns the stored text into the object that knows the rule (see QuestGoal).
package model;

public enum GoalType {
    COMPLETE_N("Finish N tasks"),
    COMPLETE_EARLY("Finish early (×1.2+)"),
    COMPLETE_TYPE("Tasks of one type"),
    CLEAR_OVERDUE("Clear late tasks");

    private final String label;

    GoalType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public static GoalType parse(String s) {
        for (GoalType g : values()) if (g.name().equals(s)) return g;
        return null;
    }

    /** Factory: the QuestGoal object for this type (taskType only matters for COMPLETE_TYPE). */
    public QuestGoal goal(TaskType taskType) {
        return switch (this) {
            case COMPLETE_N -> new CompleteNGoal();
            case COMPLETE_EARLY -> new CompleteEarlyGoal();
            case COMPLETE_TYPE -> new CompleteTypeGoal(taskType);
            case CLEAR_OVERDUE -> new ClearOverdueGoal();
        };
    }
}
