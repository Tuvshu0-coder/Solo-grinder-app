// "Finish early": only tasks finished at x1.2 or better count. Needs an open task that is not late yet.
package model;

public class CompleteEarlyGoal extends QuestGoal {

    @Override
    public boolean counts(Completion c) {
        return c.isEarly();
    }

    @Override
    public boolean isPossible(OpenTasks open) {
        return open.hasTodo();
    }
}
