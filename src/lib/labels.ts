// Mongolian UI labels for enum-like values.
export const TASK_TYPES = {
  HOMEWORK: "Гэрийн даалгавар",
  LAB: "Лаборатори",
  INDEPENDENT: "Бие даалт",
  EXAM_PREP: "Шалгалтын бэлтгэл",
  READING: "Унших материал",
} as const;
export type TaskType = keyof typeof TASK_TYPES;

export const TASK_STATUS: Record<string, string> = {
  TODO: "Хийх",
  LATE: "Хоцорсон",
  DONE: "Дууссан",
};

export const GOAL_TYPES = {
  COMPLETE_N: "N даалгавар дуусгах",
  COMPLETE_EARLY: "Эрт дуусгах (×1.2+)",
  COMPLETE_TYPE: "Тодорхой төрлийн даалгавар",
  CLEAR_OVERDUE: "Хоцорсныг дуусгах",
} as const;
export type GoalType = keyof typeof GOAL_TYPES;

export const CONDITION_TYPES = {
  STREAK: "Streak (хоног)",
  TASKS_DONE: "Дуусгасан даалгавар",
  EARLY_TASKS: "Эрт дуусгасан даалгавар",
  LEVEL: "Level",
} as const;

export const XP_SOURCES: Record<string, string> = {
  TASK: "Даалгавар",
  QUEST: "Daily quest",
  ACHIEVEMENT: "Achievement",
  GUILD_QUEST: "Guild quest",
};

export function multiplierLabel(m: number | null | undefined): string {
  if (m == null) return "—";
  if (m >= 1.5) return "Маш эрт ×1.5";
  if (m >= 1.2) return "Эрт ×1.2";
  if (m >= 1.0) return "Хугацаандаа ×1.0";
  if (m >= 0.5) return "Бага зэрэг хоцорсон ×0.5";
  return "Их хоцорсон ×0.2";
}

export function rankForLevel(level: number): string {
  if (level >= 50) return "S";
  if (level >= 40) return "A";
  if (level >= 30) return "B";
  if (level >= 20) return "C";
  if (level >= 10) return "D";
  return "E";
}
