// What the player still has to do. Used to skip impossible daily quests (rule 11).
package model;

import java.util.EnumSet;
import java.util.Set;

public class OpenTasks {
    private final Set<TaskType> types = EnumSet.noneOf(TaskType.class);
    private boolean late;
    private boolean todo;

    public void add(TaskType type, TaskStatus status) {
        if (type != null) types.add(type);
        if (status == TaskStatus.LATE) late = true;
        if (status == TaskStatus.TODO) todo = true;
    }

    public boolean hasType(TaskType t) { return types.contains(t); }
    public boolean hasLate() { return late; }
    public boolean hasTodo() { return todo; }
}
