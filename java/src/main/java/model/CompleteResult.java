// Everything that happened when a task was finished; the servlet turns it into the message shown.
package model;

import java.util.ArrayList;
import java.util.List;

public class CompleteResult {
    private final double multiplier;
    private final int baseXp;
    private final int granted;
    private final List<String> questsCompleted = new ArrayList<>();
    private final List<String> achievementsUnlocked = new ArrayList<>();
    private Integer leveledUpTo;
    private boolean guildQuestCompleted;

    public CompleteResult(double multiplier, int baseXp, int granted) {
        this.multiplier = multiplier;
        this.baseXp = baseXp;
        this.granted = granted;
    }

    public double getMultiplier() { return multiplier; }
    public int getBaseXp() { return baseXp; }
    public int getGranted() { return granted; }
    public List<String> getQuestsCompleted() { return questsCompleted; }
    public List<String> getAchievementsUnlocked() { return achievementsUnlocked; }
    public Integer getLeveledUpTo() { return leveledUpTo; }
    public void setLeveledUpTo(Integer level) { this.leveledUpTo = level; }
    public boolean isGuildQuestCompleted() { return guildQuestCompleted; }
    public void setGuildQuestCompleted(boolean done) { this.guildQuestCompleted = done; }
}
