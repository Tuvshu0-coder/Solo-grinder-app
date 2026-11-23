// Facts about one task the player just finished. Quest goals look at these.
package model;

public class Completion {
    private final TaskType taskType;
    private final boolean early;   // multiplier >= 1.2
    private final boolean late;    // finished after the deadline

    public Completion(TaskType taskType, boolean early, boolean late) {
        this.taskType = taskType;
        this.early = early;
        this.late = late;
    }

    public TaskType getTaskType() { return taskType; }
    public boolean isEarly() { return early; }
    public boolean wasLate() { return late; }
}
