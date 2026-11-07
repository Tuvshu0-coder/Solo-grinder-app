import { randomBytes } from "crypto";
import { prisma, type Tx } from "./db";
import { dayStart, weekStartKey } from "./time";

export function newInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

/**
 * Removes a member. If they led the guild, leadership passes to the longest-standing
 * member (rule 20); if they were the last member, the guild is deleted.
 */
export async function removeMember(tx: Tx, guildId: number, userId: number) {
  const member = await tx.guildMember.findUnique({ where: { userId } });
  if (!member || member.guildId !== guildId) return;
  await tx.guildMember.delete({ where: { userId } });

  const remaining = await tx.guildMember.findMany({ where: { guildId }, orderBy: { joinedAt: "asc" } });
  if (remaining.length === 0) {
    await tx.guild.delete({ where: { id: guildId } });
    return;
  }
  if (member.role === "LEADER") await promoteOldest(tx, guildId, userId);
}

/** Gives leadership to the longest-standing active member other than `excludeUserId`. */
export async function promoteOldest(tx: Tx, guildId: number, excludeUserId: number) {
  const next = await tx.guildMember.findFirst({
    where: { guildId, userId: { not: excludeUserId }, user: { isSuspended: false } },
    orderBy: { joinedAt: "asc" },
  });
  if (!next) return;
  await tx.guildMember.updateMany({ where: { guildId, role: "LEADER" }, data: { role: "MEMBER" } });
  await tx.guildMember.update({ where: { userId: next.userId }, data: { role: "LEADER" } });
}

export interface LeaderboardRow {
  userId: number;
  username: string;
  role: string;
  weekXp: number;
  earlyCount: number;
  doneCount: number;
  joinedAt: Date;
}

/**
 * Rule 17: weekly XP earned while in this guild, excluding guild-quest bonus.
 * Ties: more early completions, then earlier join date. Suspended users hidden.
 */
export async function guildLeaderboard(guildId: number, now = new Date()): Promise<LeaderboardRow[]> {
  const weekStart = dayStart(weekStartKey(now));
  const members = await prisma.guildMember.findMany({
    where: { guildId, user: { isSuspended: false } },
    include: { user: true },
  });

  const rows: LeaderboardRow[] = [];
  for (const m of members) {
    const since = m.joinedAt > weekStart ? m.joinedAt : weekStart;
    const xp = await prisma.xpLog.aggregate({
      where: { userId: m.userId, createdAt: { gte: since }, source: { not: "GUILD_QUEST" } },
      _sum: { xpAmount: true },
    });
    const done = await prisma.task.findMany({
      where: { subject: { userId: m.userId }, status: "DONE", completedAt: { gte: since } },
      select: { multiplier: true },
    });
    rows.push({
      userId: m.userId,
      username: m.user.username,
      role: m.role,
      weekXp: xp._sum.xpAmount ?? 0,
      earlyCount: done.filter((d) => (d.multiplier ?? 0) > 1).length,
      doneCount: done.length,
      joinedAt: m.joinedAt,
    });
  }
  return rows.sort(
    (a, b) => b.weekXp - a.weekXp || b.earlyCount - a.earlyCount || a.joinedAt.getTime() - b.joinedAt.getTime(),
  );
}
