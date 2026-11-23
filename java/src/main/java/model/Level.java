// Level = one row of "Level": the row id IS the level number. minXp = total XP needed.
package model;

public class Level {
    private final int id;
    private final int minXp;
    private final String rank;
    private final int userCount; // admin page only

    public Level(int id, int minXp, String rank, int userCount) {
        this.id = id;
        this.minXp = minXp;
        this.rank = rank;
        this.userCount = userCount;
    }

    public int getId() { return id; }
    public int getMinXp() { return minXp; }
    public String getRank() { return rank; }
    public int getUserCount() { return userCount; }
}
