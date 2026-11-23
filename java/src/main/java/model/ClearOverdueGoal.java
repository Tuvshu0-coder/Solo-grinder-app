// "Finish a late task": only tasks finished after their deadline count. Needs a late task to exist.
package model;

public class ClearOverdueGoal extends QuestGoal {

    @Override
    public boolean counts(Completion c) {
        return c.wasLate();
    }

    @Override
    public boolean isPossible(OpenTasks open) {
        return open.hasLate();
    }
}
