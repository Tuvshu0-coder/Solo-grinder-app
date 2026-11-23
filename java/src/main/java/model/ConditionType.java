// What an achievement measures. Each constant says how to read its number from PlayerStats:
// an enum with its own method body per constant, a second, smaller example of polymorphism.
package model;

public enum ConditionType {
    STREAK("Streak (days)") {
        @Override public int valueOf(PlayerStats s) { return s.getStreak(); }
    },
    TASKS_DONE("Tasks finished") {
        @Override public int valueOf(PlayerStats s) { return s.getTasksDone(); }
    },
    EARLY_TASKS("Tasks finished early") {
        @Override public int valueOf(PlayerStats s) { return s.getEarlyTasks(); }
    },
    LEVEL("Level") {
        @Override public int valueOf(PlayerStats s) { return s.getLevel(); }
    };

    private final String label;

    ConditionType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public abstract int valueOf(PlayerStats s);

    public static ConditionType parse(String s) {
        for (ConditionType c : values()) if (c.name().equals(s)) return c;
        return null;
    }
}
