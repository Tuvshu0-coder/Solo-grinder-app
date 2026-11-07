// Game engine: every XP change goes through grantXp(). Implements section 8 / section 10.
import { prisma, type Tx } from "./db";
import { addDays, dayKey, dayStart, weekStartKey } from "./time";
import {
  capXp,
  computeMultiplier,
  DAILY_QUEST_COUNT,
  GUILD_QUEST_REWARD,
  nextStreak,
  xpForMultiplier,
} from "./rules";

// ---------- XP ----------

export async function xpToday(tx: Tx, userId: number, now = new Date()): Promise<number> {
  const agg = await tx.xpLog.aggregate({
    where: { userId, createdAt: { gte: dayStart(dayKey(now)) } },
    _sum: { xpAmount: true },
  });
  return agg._sum.xpAmount ?? 0;
}

/** Grants XP respecting the 400/day cap (rule 9). Returns XP actually granted. */
export async function grantXp(
  tx: Tx,
  userId: number,
  amount: number,
  source: "TASK" | "QUEST" | "ACHIEVEMENT" | "GUILD_QUEST",
  sourceId: number | null,
  now = new Date(),
): Promise<number> {
  if (amount <= 0) return 0;
  const granted = capXp(amount, await xpToday(tx, userId, now));
  await tx.xpLog.create({ data: { userId, source, sourceId, xpAmount: granted, createdAt: now } });
  if (granted > 0) {
    await tx.user.update({ where: { id: userId }, data: { totalXp: { increment: granted } } });
  }
  return granted;
}

export async function updateLevel(tx: Tx, userId: number): Promise<number> {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const level = await tx.level.findFirst({
    where: { minXp: { lte: user.totalXp } },
    orderBy: { id: "desc" },
  });
  const levelId = level?.id ?? 1;
  if (levelId !== user.levelId) await tx.user.update({ where: { id: userId }, data: { levelId } });
  return levelId;
}

// ---------- Maintenance (the "00:00 job", run lazily on each request) ----------

export async function runMaintenance(now = new Date()) {
  const yesterday = addDays(dayKey(now), -1);
  // Rule 10: overdue tasks become LATE.
  await prisma.task.updateMany({
    where: { status: "TODO", deadline: { lt: now } },
    data: { status: "LATE" },
  });
  // Rule 12: a skipped day resets the streak.
  await prisma.user.updateMany({
    where: { streak: { gt: 0 }, OR: [{ lastActiveDate: null }, { lastActiveDate: { lt: yesterday } }] },
    data: { streak: 0 },
  });
}

// ---------- Daily quests (rule 11) ----------

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export async function ensureDailyQuests(userId: number, now = new Date()) {
  const today = dayKey(now);
  const existing = await prisma.dailyQuest.count({ where: { userId, questDate: today } });
  if (existing > 0) return;

  const templates = await prisma.questTemplate.findMany({ where: { isActive: true } });
  const openTasks = await prisma.task.findMany({
    where: { subject: { userId }, status: { in: ["TODO", "LATE"] } },
    select: { type: true, status: true },
  });
  const openTypes = new Set(openTasks.map((t) => t.type));
  const hasLate = openTasks.some((t) => t.status === "LATE");
  const hasTodo = openTasks.some((t) => t.status === "TODO");

  // Impossible quests are swapped out (rule 11).
  const feasible = templates.filter((t) => {
    if (t.goalType === "COMPLETE_TYPE") return !!t.taskType && openTypes.has(t.taskType);
    if (t.goalType === "CLEAR_OVERDUE") return hasLate;
    if (t.goalType === "COMPLETE_EARLY") return hasTodo;
    return true;
  });

  // Prefer 3 different goal types; fall back to other templates if not enough types.
  const picked: typeof templates = [];
  const usedTypes = new Set<string>();
  for (const t of shuffle(feasible)) {
    if (picked.length >= DAILY_QUEST_COUNT) break;
    if (!usedTypes.has(t.goalType)) {
      picked.push(t);
      usedTypes.add(t.goalType);
    }
  }
  for (const t of shuffle(feasible)) {
    if (picked.length >= DAILY_QUEST_COUNT) break;
    if (!picked.includes(t)) picked.push(t);
  }

  await prisma.dailyQuest.createMany({
    data: picked.map((t) => ({ userId, templateId: t.id, questDate: today })),
  });
}

// ---------- Task completion (section 10, steps 5–7) ----------

interface Completion {
  type: string;
  early: boolean; // multiplier >= 1.2
  wasLate: boolean;
}

function goalMatches(goalType: string, taskType: string | null, c: Completion): boolean {
  switch (goalType) {
    case "COMPLETE_N":
      return true;
    case "COMPLETE_EARLY":
      return c.early;
    case "COMPLETE_TYPE":
      return taskType === c.type;
    case "CLEAR_OVERDUE":
      return c.wasLate;
    default:
      return false;
  }
}

export interface CompleteResult {
  multiplier: number;
  baseXp: number;
  granted: number;
  questsCompleted: string[];
  achievementsUnlocked: string[];
  leveledUpTo: number | null;
  guildQuestCompleted: boolean;
}

export async function completeTask(userId: number, taskId: number, now = new Date()): Promise<CompleteResult> {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirst({ where: { id: taskId, subject: { userId } } });
    if (!task) throw new Error("Даалгавар олдсонгүй.");
    if (task.status === "DONE") throw new Error("Даалгавар аль хэдийн дууссан.");

    const today = dayKey(now);
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const startLevel = user.levelId;

    // Rule 8: count today's early bonuses.
    const earlyBonusesUsedToday = await tx.task.count({
      where: { subject: { userId }, status: "DONE", completedAt: { gte: dayStart(today) }, multiplier: { gt: 1 } },
    });
    const multiplier = computeMultiplier({ ...task, now, earlyBonusesUsedToday });
    const baseXp = xpForMultiplier(multiplier);
    const wasLate = now > task.deadline;

    const granted = await grantXp(tx, userId, baseXp, "TASK", task.id, now);
    await tx.task.update({
      where: { id: task.id },
      data: { status: "DONE", completedAt: now, multiplier, xpEarned: granted },
    });

    const completion: Completion = { type: task.type, early: multiplier >= 1.2, wasLate };

    // Step 6a: daily quests.
    const questsCompleted: string[] = [];
    const quests = await tx.dailyQuest.findMany({
      where: { userId, questDate: today, isCompleted: false },
      include: { template: true },
    });
    for (const q of quests) {
      if (!goalMatches(q.template.goalType, q.template.taskType, completion)) continue;
      const progress = q.progress + 1;
      const done = progress >= q.template.targetValue;
      await tx.dailyQuest.update({ where: { id: q.id }, data: { progress, isCompleted: done } });
      if (done) {
        await grantXp(tx, userId, q.template.xpReward, "QUEST", q.id, now);
        questsCompleted.push(q.template.title);
      }
    }

    // Step 6b: streak — only on-time completions count (rule 12).
    if (!wasLate) {
      const streak = nextStreak(user.streak, user.lastActiveDate, today, addDays(today, -1));
      await tx.user.update({ where: { id: userId }, data: { streak, lastActiveDate: today } });
    }

    // Step 6c/6d: achievements, then level (repeat once so LEVEL achievements can fire).
    const achievementsUnlocked = await checkAchievements(tx, userId, now);
    let level = await updateLevel(tx, userId);
    if (level !== startLevel) {
      achievementsUnlocked.push(...(await checkAchievements(tx, userId, now)));
      level = await updateLevel(tx, userId);
    }

    // Step 7: guild quest progress.
    const guildQuestCompleted = await progressGuildQuest(tx, userId, completion, now);

    return {
      multiplier,
      baseXp,
      granted,
      questsCompleted,
      achievementsUnlocked,
      leveledUpTo: level !== startLevel ? level : null,
      guildQuestCompleted,
    };
  });
}

async function checkAchievements(tx: Tx, userId: number, now: Date): Promise<string[]> {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, include: { achievements: true } });
  const owned = new Set(user.achievements.map((a) => a.achievementId));
  const candidates = (await tx.achievement.findMany()).filter((a) => !owned.has(a.id));
  if (candidates.length === 0) return [];

  const doneCount = await tx.task.count({ where: { subject: { userId }, status: "DONE" } });
  const earlyCount = await tx.task.count({ where: { subject: { userId }, status: "DONE", multiplier: { gt: 1 } } });

  const unlocked: string[] = [];
  for (const a of candidates) {
    const value =
      a.conditionType === "STREAK"
        ? user.streak
        : a.conditionType === "TASKS_DONE"
          ? doneCount
          : a.conditionType === "EARLY_TASKS"
            ? earlyCount
            : a.conditionType === "LEVEL"
              ? user.levelId
              : -1;
    if (value < a.threshold) continue;
    await tx.userAchievement.create({ data: { userId, achievementId: a.id, unlockedAt: now } }); // rule 14
    await grantXp(tx, userId, a.xpReward, "ACHIEVEMENT", a.id, now); // inside the cap (rule 9)
    unlocked.push(a.name);
  }
  return unlocked;
}

async function progressGuildQuest(tx: Tx, userId: number, c: Completion, now: Date): Promise<boolean> {
  const member = await tx.guildMember.findUnique({ where: { userId } });
  if (!member) return false;
  const weekStart = weekStartKey(now);
  const quest = await tx.guildQuest.findUnique({
    where: { guildId_weekStart: { guildId: member.guildId, weekStart } },
  });
  if (!quest || quest.isCompleted || !goalMatches(quest.goalType, quest.taskType, c)) return false;

  const progress = quest.progress + 1;
  const done = progress >= quest.targetValue;
  await tx.guildQuest.update({ where: { id: quest.id }, data: { progress, isCompleted: done } });
  if (!done) return false;

  // Rule 19: +50 XP to each member who completed >= 1 task this week.
  const members = await tx.guildMember.findMany({ where: { guildId: member.guildId } });
  for (const m of members) {
    const active = await tx.task.count({
      where: { subject: { userId: m.userId }, status: "DONE", completedAt: { gte: dayStart(weekStart) } },
    });
    if (active > 0) {
      await grantXp(tx, m.userId, GUILD_QUEST_REWARD, "GUILD_QUEST", quest.id, now);
      await updateLevel(tx, m.userId);
    }
  }
  return true;
}
