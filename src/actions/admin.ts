"use server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { promoteOldest } from "@/lib/guild";
import { CONDITION_TYPES, GOAL_TYPES, TASK_TYPES } from "@/lib/labels";
import { back, int, str } from "./util";

// ---------- Users ----------

export async function setSuspended(fd: FormData) {
  await requireAdmin();
  const userId = int(fd, "userId");
  const suspend = str(fd, "suspend") === "1";
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role === "ADMIN") back("/admin/users", "err", "Хэрэглэгч олдсонгүй.");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isSuspended: suspend } });
    if (suspend) {
      await tx.session.deleteMany({ where: { userId } });
      // Rule 20: a suspended leader hands leadership to the longest-standing member.
      const m = await tx.guildMember.findUnique({ where: { userId } });
      if (m?.role === "LEADER") await promoteOldest(tx, m.guildId, userId);
    }
  });
  back("/admin/users", "msg", suspend ? `${user.username} түдгэлзүүлэгдлээ.` : `${user.username} сэргээгдлээ.`);
}

// ---------- Quest templates ----------

export async function saveTemplate(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id");
  const title = str(fd, "title");
  const goalType = str(fd, "goalType");
  const taskType = str(fd, "taskType") || null;
  const targetValue = int(fd, "targetValue");
  const xpReward = int(fd, "xpReward");
  const P = "/admin/quests";
  if (!title) back(P, "err", "Гарчиг оруулна уу.");
  if (!(goalType in GOAL_TYPES)) back(P, "err", "Зорилтын төрөл буруу.");
  if (goalType === "COMPLETE_TYPE" && !(taskType && taskType in TASK_TYPES)) back(P, "err", "Даалгаврын төрөл сонгоно уу.");
  if (!(targetValue >= 1) || !(xpReward >= 0)) back(P, "err", "Зорилт ≥ 1, XP ≥ 0 байна.");
  const data = { title, goalType, taskType: goalType === "COMPLETE_TYPE" ? taskType : null, targetValue, xpReward };
  if (id) await prisma.questTemplate.update({ where: { id }, data });
  else await prisma.questTemplate.create({ data });
  back(P, "msg", "Quest загвар хадгалагдлаа.");
}

export async function toggleTemplate(fd: FormData) {
  await requireAdmin();
  const t = await prisma.questTemplate.findUnique({ where: { id: int(fd, "id") } });
  if (!t) back("/admin/quests", "err", "Загвар олдсонгүй.");
  await prisma.questTemplate.update({ where: { id: t.id }, data: { isActive: !t.isActive } });
  back("/admin/quests", "msg", t.isActive ? "Загвар идэвхгүй боллоо." : "Загвар идэвхжлээ.");
}

// ---------- Achievements ----------

export async function saveAchievement(fd: FormData) {
  await requireAdmin();
  const P = "/admin/achievements";
  const id = int(fd, "id");
  const name = str(fd, "name");
  const description = str(fd, "description");
  const conditionType = str(fd, "conditionType");
  const threshold = int(fd, "threshold");
  const xpReward = int(fd, "xpReward");
  if (!name) back(P, "err", "Нэр оруулна уу.");
  if (!(conditionType in CONDITION_TYPES)) back(P, "err", "Нөхцлийн төрөл буруу.");
  if (!(threshold >= 1) || !(xpReward >= 0)) back(P, "err", "Босго ≥ 1, XP ≥ 0 байна.");
  const data = { name, description, conditionType, threshold, xpReward };
  if (id) await prisma.achievement.update({ where: { id }, data });
  else await prisma.achievement.create({ data });
  back(P, "msg", "Achievement хадгалагдлаа.");
}

// ---------- Levels ----------

export async function saveLevel(fd: FormData) {
  await requireAdmin();
  const P = "/admin/levels";
  const id = int(fd, "id");
  const minXp = int(fd, "minXp");
  const rank = str(fd, "rank").toUpperCase();
  if (!(id >= 1)) back(P, "err", "Level буруу.");
  if (!["E", "D", "C", "B", "A", "S"].includes(rank)) back(P, "err", "Rank нь E, D, C, B, A, S-ийн нэг.");
  if (id === 1 && minXp !== 0) back(P, "err", "Level 1-ийн босго 0 байна.");
  const prev = await prisma.level.findUnique({ where: { id: id - 1 } });
  const next = await prisma.level.findUnique({ where: { id: id + 1 } });
  if ((prev && minXp <= prev.minXp) || (next && minXp >= next.minXp))
    back(P, "err", "Босго өмнөх level-ээс их, дараагийнхаас бага байх ёстой.");
  await prisma.level.upsert({ where: { id }, update: { minXp, rank }, create: { id, minXp, rank } });

  // Recompute every user's level against the new thresholds.
  const levels = await prisma.level.findMany({ orderBy: { id: "desc" } });
  const users = await prisma.user.findMany({ select: { id: true, totalXp: true, levelId: true } });
  for (const u of users) {
    const lvl = levels.find((l) => l.minXp <= u.totalXp)?.id ?? 1;
    if (lvl !== u.levelId) await prisma.user.update({ where: { id: u.id }, data: { levelId: lvl } });
  }
  back(P, "msg", `Level ${id} хадгалагдлаа.`);
}
