// Task = one piece of coursework with a deadline. Finishing it early earns more XP.
package model;

import java.time.Instant;

public class Task {
    private final int id;
    private final int subjectId;
    private final String subjectName; // joined from Subject, for display
    private final String title;
    private final TaskType type;
    private final Instant deadline;
    private final Instant createdAt;
    private final Instant completedAt; // null until done
    private final TaskStatus status;
    private final Double multiplier;   // null until done
    private final int xpEarned;
    private final boolean deadlineEdited;

    public Task(int id, int subjectId, String subjectName, String title, TaskType type, Instant deadline,
                Instant createdAt, Instant completedAt, TaskStatus status, Double multiplier, int xpEarned,
                boolean deadlineEdited) {
        this.id = id;
        this.subjectId = subjectId;
        this.subjectName = subjectName;
        this.title = title;
        this.type = type;
        this.deadline = deadline;
        this.createdAt = createdAt;
        this.completedAt = completedAt;
        this.status = status;
        this.multiplier = multiplier;
        this.xpEarned = xpEarned;
        this.deadlineEdited = deadlineEdited;
    }

    public int getId() { return id; }
    public int getSubjectId() { return subjectId; }
    public String getSubjectName() { return subjectName; }
    public String getTitle() { return title; }
    public TaskType getType() { return type; }
    public Instant getDeadline() { return deadline; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getCompletedAt() { return completedAt; }
    public TaskStatus getStatus() { return status; }
    public boolean isDone() { return status == TaskStatus.DONE; }
    public Double getMultiplier() { return multiplier; }
    public int getXpEarned() { return xpEarned; }
    public boolean isDeadlineEdited() { return deadlineEdited; }
}
