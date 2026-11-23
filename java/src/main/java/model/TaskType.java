// The five kinds of task (labels shown in the UI).
package model;

public enum TaskType {
    HOMEWORK("Homework"),
    LAB("Lab"),
    INDEPENDENT("Independent work"),
    EXAM_PREP("Exam prep"),
    READING("Reading");

    private final String label;

    TaskType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    /** The type for a form or database value, or null if it is not one of the five. */
    public static TaskType parse(String s) {
        for (TaskType t : values()) if (t.name().equals(s)) return t;
        return null;
    }
}
