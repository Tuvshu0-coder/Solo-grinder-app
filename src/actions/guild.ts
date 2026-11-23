"use server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { newInviteCode, removeMember } from "@/lib/guild";
import { GUILD_COOLDOWN_MS, GUILD_MAX_MEMBERS, minGuildQuestTarget } from "@/lib/rules";
import { GOAL_TYPES, TASK_TYPES } from "@/lib/labels";
import { fmt, weekStartKey } from "@/lib/time";
import { back, int, str } from "./util";

const PAGE = "/guild";

async function student() {
  const user = await requireUser();
  if (user.role !== "STUDENT") back("/admin", "err", "Students only.");
  return user;
}

/** Rule 16: 7-day cooldown after leaving a guild. */
function cooldownError(guildLeftAt: Date | null): string | null {
  if (!guildLeftAt) return null;
  const until = new Date(guildLeftAt.getTime() + GUILD_COOLDOWN_MS);
  return until > new Date() ? `You left a guild less than 7 days ago. You can join again after ${fmt(until)}.` : null;
}

async function leaderOf(userId: number) {
  const m = await prisma.guildMember.findUnique({ where: { userId } });
  if (!m || m.role !== "LEADER") back(PAGE, "err", "Only the guild leader can do that.");
  return m;
}

export async function createGuild(fd: FormData) {
  const user = await student();
  const name = str(fd, "name");
  if (!name || name.length > 40) back(PAGE, "err", "Guild name must be 1–40 characters.");
  if (await prisma.guildMember.findUnique({ where: { userId: user.id } }))
    back(PAGE, "err", "You are already in a guild."); // rule 15
  const cd = cooldownError(user.guildLeftAt);
  if (cd) back(PAGE, "err", cd);

  let code = newInviteCode();
  while (await prisma.guild.findUnique({ where: { inviteCode: code } })) code = newInviteCode();
  await prisma.guild.create({
    data: { name, inviteCode: code, members: { create: { userId: user.id, role: "LEADER" } } },
  });
  back(PAGE, "msg", `Created guild "${name}". Invite code: ${code}`);
}

export async function joinGuild(fd: FormData) {
  const user = await student();
  const code = str(fd, "code").toUpperCase();
  if (await prisma.guildMember.findUnique({ where: { userId: user.id } }))
    back(PAGE, "err", "You are already in a guild.");
  const cd = cooldownError(user.guildLeftAt);
  if (cd) back(PAGE, "err", cd);
  const guild = await prisma.guild.findUnique({ where: { inviteCode: code }, include: { _count: { select: { members: true } } } });
  if (!guild) back(PAGE, "err", "Invalid invite code.");
  if (guild._count.members >= GUILD_MAX_MEMBERS) back(PAGE, "err", "This guild is full (30 members).");
  await prisma.guildMember.create({ data: { guildId: guild.id, userId: user.id } });
  back(PAGE, "msg", `Joined "${guild.name}"!`);
}

export async function leaveGuild() {
  const user = await student();
  const m = await prisma.guildMember.findUnique({ where: { userId: user.id } });
  if (!m) back(PAGE, "err", "You are not in a guild.");
  await prisma.$transaction(async (tx) => {
    await removeMember(tx, m.guildId, user.id); // rule 20
    await tx.user.update({ where: { id: user.id }, data: { guildLeftAt: new Date() } }); // rule 16
  });
  back(PAGE, "msg", "You left the guild. You can join another one in 7 days.");
}

export async function kickMember(fd: FormData) {
  const user = await student();
  const leader = await leaderOf(user.id);
  const targetId = int(fd, "userId");
  if (targetId === user.id) back(PAGE, "err", "You can't remove yourself. Use Leave guild instead.");
  await prisma.$transaction((tx) => removeMember(tx, leader.guildId, targetId));
  back(PAGE, "msg", "Member removed.");
}

export async function transferLeader(fd: FormData) {
  const user = await student();
  const leader = await leaderOf(user.id);
  const target = await prisma.guildMember.findUnique({ where: { userId: int(fd, "userId") } });
  if (!target || target.guildId !== leader.guildId) back(PAGE, "err", "Member not found.");
  await prisma.$transaction([
    prisma.guildMember.update({ where: { userId: user.id }, data: { role: "MEMBER" } }),
    prisma.guildMember.update({ where: { userId: target.userId }, data: { role: "LEADER" } }),
  ]);
  back(PAGE, "msg", "Leadership handed over.");
}

export async function setGuildQuest(fd: FormData) {
  const user = await student();
  const leader = await leaderOf(user.id);
  const goalType = str(fd, "goalType");
  const taskType = str(fd, "taskType") || null;
  const target = int(fd, "targetValue");
  if (!(goalType in GOAL_TYPES)) back(PAGE, "err", "Choose a goal type.");
  if (goalType === "COMPLETE_TYPE" && !(taskType && taskType in TASK_TYPES))
    back(PAGE, "err", "Choose a task type.");

  const members = await prisma.guildMember.count({ where: { guildId: leader.guildId } });
  const min = minGuildQuestTarget(members); // rule 18
  if (!Number.isInteger(target) || target < min)
    back(PAGE, "err", `The target must be at least ${min} (members × 3).`);

  const weekStart = weekStartKey();
  if (await prisma.guildQuest.findUnique({ where: { guildId_weekStart: { guildId: leader.guildId, weekStart } } }))
    back(PAGE, "err", "This week's guild quest is already set.");

  const typeLabel = goalType === "COMPLETE_TYPE" ? ` (${TASK_TYPES[taskType as keyof typeof TASK_TYPES]})` : "";
  await prisma.guildQuest.create({
    data: {
      guildId: leader.guildId,
      title: `${GOAL_TYPES[goalType as keyof typeof GOAL_TYPES]}${typeLabel}: ${target} total`,
      goalType,
      taskType: goalType === "COMPLETE_TYPE" ? taskType : null,
      targetValue: target,
      weekStart,
    },
  });
  back(PAGE, "msg", "This week's guild quest is set.");
}
