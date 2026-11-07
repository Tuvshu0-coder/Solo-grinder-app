// Pure rule functions (section 8). No database access — unit-testable.
import { DAY, HOUR } from "./time";

export const BASE_XP = 50; // rule 6
export const DAILY_XP_CAP = 400; // rule 9
export const EARLY_BONUS_MIN_OPEN_MS = 24 * HOUR; // rule 7
export const EARLY_BONUS_PER_DAY = 3; // rule 8
export const DEADLINE_MIN_MS = 3 * HOUR; // rule 3
export const DEADLINE_MAX_MS = 30 * DAY; // rule 3
export const DEADLINE_EDIT_MIN_LEFT_MS = 24 * HOUR; // rule 4
export const GUILD_MAX_MEMBERS = 30; // rule 15
export const GUILD_COOLDOWN_MS = 7 * DAY; // rule 16
export const GUILD_QUEST_PER_MEMBER = 3; // rule 18
export const GUILD_QUEST_REWARD = 50; // rule 19
export const DAILY_QUEST_COUNT = 3; // rule 11

export interface MultiplierInput {
  createdAt: Date;
  deadline: Date;
  deadlineEdited: boolean;
  now: Date;
  earlyBonusesUsedToday: number;
}

/** XP multiplier per the table in section 8 plus rules 4, 7, 8. */
export function computeMultiplier(t: MultiplierInput): number {
  const now = t.now.getTime();
  const deadline = t.deadline.getTime();
  const created = t.createdAt.getTime();

  if (now > deadline) return now - deadline <= DAY ? 0.5 : 0.2;

  const total = deadline - created;
  const fracLeft = total > 0 ? (deadline - now) / total : 0;
  let m = fracLeft > 0.5 ? 1.5 : fracLeft >= 0.2 ? 1.2 : 1.0;

  if (m > 1) {
    if (now - created < EARLY_BONUS_MIN_OPEN_MS) m = 1.0; // rule 7
    else if (t.deadlineEdited) m = 1.0; // rule 4
    else if (t.earlyBonusesUsedToday >= EARLY_BONUS_PER_DAY) m = 1.0; // rule 8
  }
  return m;
}

export function xpForMultiplier(m: number): number {
  return Math.round(BASE_XP * m);
}

/** How much of `amount` fits under the daily cap (rule 9). */
export function capXp(amount: number, alreadyToday: number): number {
  return Math.max(0, Math.min(amount, DAILY_XP_CAP - alreadyToday));
}

/** Default level threshold: total XP to reach level L = 20 * L^2 (level 1 = 0). */
export function defaultMinXp(level: number): number {
  return level <= 1 ? 0 : 20 * level * level;
}

/** Validate a new deadline (rule 3). Returns an error message or null. */
export function validateDeadline(deadline: Date, from: Date): string | null {
  const diff = deadline.getTime() - from.getTime();
  if (Number.isNaN(diff)) return "Deadline буруу байна.";
  if (diff < DEADLINE_MIN_MS) return "Deadline хамгийн багадаа 3 цагийн дараа байх ёстой.";
  if (diff > DEADLINE_MAX_MS) return "Deadline хамгийн ихдээ 30 хоногийн дараа байх ёстой.";
  return null;
}

/** Rule 4: may this task's deadline be edited now? */
export function canEditDeadline(
  t: { deadline: Date; deadlineEdited: boolean; status: string },
  now: Date,
): string | null {
  if (t.status === "DONE") return "Дууссан даалгаврын deadline-ийг өөрчлөх боломжгүй.";
  if (t.deadlineEdited) return "Deadline-ийг зөвхөн нэг удаа өөрчилж болно.";
  if (t.deadline.getTime() - now.getTime() < DEADLINE_EDIT_MIN_LEFT_MS)
    return "Deadline хүртэл 24 цагаас бага үлдсэн тул өөрчлөх боломжгүй.";
  return null;
}

/** Rule 12: new streak value after an on-time completion today. */
export function nextStreak(
  streak: number,
  lastActiveDate: string | null,
  today: string,
  yesterday: string,
): number {
  if (lastActiveDate === today) return streak;
  if (lastActiveDate === yesterday) return streak + 1;
  return 1;
}

/** Rule 18: minimum guild quest target. */
export function minGuildQuestTarget(memberCount: number): number {
  return Math.max(1, memberCount) * GUILD_QUEST_PER_MEMBER;
}
