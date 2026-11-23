// DailyQuest = one quest given to one student for one day, with its progress.
package model;

public class DailyQuest {
    private final int id;
    private final String questDate;
    private final int progress;
    private final boolean completed;
    private final QuestTemplate template;

    public DailyQuest(int id, String questDate, int progress, boolean completed, QuestTemplate template) {
        this.id = id;
        this.questDate = questDate;
        this.progress = progress;
        this.completed = completed;
        this.template = template;
    }

    public int getId() { return id; }
    public String getQuestDate() { return questDate; }
    public int getProgress() { return progress; }
    public boolean isCompleted() { return completed; }
    public QuestTemplate getTemplate() { return template; }
}
