// Where a row of XP history came from.
package model;

public enum XpSource {
    TASK("Task"),
    QUEST("Daily quest"),
    ACHIEVEMENT("Achievement"),
    GUILD_QUEST("Guild quest");

    private final String label;

    XpSource(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
