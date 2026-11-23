// Mongolian UI labels for enum-like values.
export const TASK_TYPES = {
  HOMEWORK: "Homework",
  LAB: "Lab",
  INDEPENDENT: "Independent work",
  EXAM_PREP: "Exam prep",
  READING: "Reading",
} as const;
export type TaskType = keyof typeof TASK_TYPES;

export const TASK_STATUS: Record<string, string> = {
  TODO: "To do",
  LATE: "Late",
  DONE: "Done",
};

export const GOAL_TYPES = {
  COMPLETE_N: "Finish N tasks",
  COMPLETE_EARLY: "Finish early (×1.2+)",
  COMPLETE_TYPE: "Tasks of one type",
  CLEAR_OVERDUE: "Clear late tasks",
} as const;
export type GoalType = keyof typeof GOAL_TYPES;

export const CONDITION_TYPES = {
  STREAK: "Streak (days)",
  TASKS_DONE: "Tasks finished",
  EARLY_TASKS: "Tasks finished early",
  LEVEL: "Level",
} as const;

export const XP_SOURCES: Record<string, string> = {
  TASK: "Task",
  QUEST: "Daily quest",
  ACHIEVEMENT: "Achievement",
  GUILD_QUEST: "Guild quest",
};

export function multiplierLabel(m: number | null | undefined): string {
  if (m == null) return "—";
  if (m >= 1.5) return "Very early ×1.5";
  if (m >= 1.2) return "Early ×1.2";
  if (m >= 1.0) return "On time ×1.0";
  if (m >= 0.5) return "A bit late ×0.5";
  return "Very late ×0.2";
}

export function rankForLevel(level: number): string {
  if (level >= 50) return "S";
  if (level >= 40) return "A";
  if (level >= 30) return "B";
  if (level >= 20) return "C";
  if (level >= 10) return "D";
  return "E";
}
