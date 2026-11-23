// Subject = one course (e.g. "Databases"). Every task belongs to exactly one subject (rule 2).
// The three counts are filled in by SubjectDAO.findByUser for the Subjects page.
package model;

public class Subject {
    private final int id;
    private final String name;
    private final int total;
    private final int done;
    private final int late;

    public Subject(int id, String name, int total, int done, int late) {
        this.id = id;
        this.name = name;
        this.total = total;
        this.done = done;
        this.late = late;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public int getTotal() { return total; }
    public int getDone() { return done; }
    public int getLate() { return late; }
    public int getOpen() { return total - done; }
}
