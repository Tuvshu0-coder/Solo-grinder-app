// "Finish a task of one type" (for example a Lab). Remembers WHICH type in a field.
package model;

public class CompleteTypeGoal extends QuestGoal {
    private final TaskType taskType;

    public CompleteTypeGoal(TaskType taskType) {
        this.taskType = taskType;
    }

    @Override
    public boolean counts(Completion c) {
        return taskType != null && taskType == c.getTaskType();
    }

    @Override
    public boolean isPossible(OpenTasks open) {
        return taskType != null && open.hasType(taskType);
    }
}
