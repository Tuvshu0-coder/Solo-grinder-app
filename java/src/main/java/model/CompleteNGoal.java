// "Finish N tasks": every finished task counts, and it is always possible.
package model;

public class CompleteNGoal extends QuestGoal {

    @Override
    public boolean counts(Completion c) {
        return true;
    }

    @Override
    public boolean isPossible(OpenTasks open) {
        return true;
    }
}
