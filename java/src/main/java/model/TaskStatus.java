// TODO -> LATE (deadline passed; set by the daily maintenance) -> DONE.
package model;

public enum TaskStatus {
    TODO("To do"),
    LATE("Late"),
    DONE("Done");

    private final String label;

    TaskStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
