// QuestGoal = what a quest asks for. THE main OOP example of this project (like Lesson 10's Delivery).
//
// ABSTRACT CLASS: you can't write new QuestGoal(). It only says that every goal CAN answer two
// questions; each child class answers them in its own way:
//   counts(c)       does this finished task move the quest forward?
//   isPossible(o)   can the player finish it today at all? (rule 11: impossible quests are skipped)
//
// POLYMORPHISM (in service.GameService):
//   QuestGoal goal = quest.getGoal();       // the real object might be a ClearOverdueGoal
//   if (goal.counts(completion)) { ... }    // Java runs ClearOverdueGoal's counts()
// The same code handles daily quests AND guild quests, with no "if COMPLETE_N ... else if ..." chain.
// A new kind of quest = one new class + one line in GoalType.goal().
package model;

public abstract class QuestGoal {

    public abstract boolean counts(Completion c);

    public abstract boolean isPossible(OpenTasks open);
}
