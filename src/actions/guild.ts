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
  if (user.role !== "STUDENT") back("/admin", "err", "Зөвхөн оюутан хэрэглэгч.");
  return user;
}

/** Rule 16: 7-day cooldown after leaving a guild. */
function cooldownError(guildLeftAt: Date | null): string | null {
  if (!guildLeftAt) return null;
  const until = new Date(guildLeftAt.getTime() + GUILD_COOLDOWN_MS);
  return until > new Date() ? `Guild-ээс гарснаас хойш 7 хоног хүлээнэ. ${fmt(until)}-с хойш нэгдэх боломжтой.` : null;
}

async function leaderOf(userId: number) {
  const m = await prisma.guildMember.findUnique({ where: { userId } });
  if (!m || m.role !== "LEADER") back(PAGE, "err", "Зөвхөн guild-ийн удирдагч хийх боломжтой.");
  return m;
}

export async function createGuild(fd: FormData) {
  const user = await student();
  const name = str(fd, "name");
  if (!name || name.length > 40) back(PAGE, "err", "Guild-ийн нэр 1–40 тэмдэгт байна.");
  if (await prisma.guildMember.findUnique({ where: { userId: user.id } }))
    back(PAGE, "err", "Та аль хэдийн guild-д харьяалагдаж байна."); // rule 15
  const cd = cooldownError(user.guildLeftAt);
  if (cd) back(PAGE, "err", cd);

  let code = newInviteCode();
  while (await prisma.guild.findUnique({ where: { inviteCode: code } })) code = newInviteCode();
  await prisma.guild.create({
    data: { name, inviteCode: code, members: { create: { userId: user.id, role: "LEADER" } } },
  });
  back(PAGE, "msg", `"${name}" guild үүслээ. Урилгын код: ${code}`);
}

export async function joinGuild(fd: FormData) {
  const user = await student();
  const code = str(fd, "code").toUpperCase();
  if (await prisma.guildMember.findUnique({ where: { userId: user.id } }))
    back(PAGE, "err", "Та аль хэдийн guild-д харьяалагдаж байна.");
  const cd = cooldownError(user.guildLeftAt);
  if (cd) back(PAGE, "err", cd);
  const guild = await prisma.guild.findUnique({ where: { inviteCode: code }, include: { _count: { select: { members: true } } } });
  if (!guild) back(PAGE, "err", "Урилгын код буруу байна.");
  if (guild._count.members >= GUILD_MAX_MEMBERS) back(PAGE, "err", "Guild дүүрсэн байна (30 гишүүн).");
  await prisma.guildMember.create({ data: { guildId: guild.id, userId: user.id } });
  back(PAGE, "msg", `"${guild.name}" guild-д нэгдлээ!`);
}

export async function leaveGuild() {
  const user = await student();
  const m = await prisma.guildMember.findUnique({ where: { userId: user.id } });
  if (!m) back(PAGE, "err", "Та guild-д харьяалагдаагүй байна.");
  await prisma.$transaction(async (tx) => {
    await removeMember(tx, m.guildId, user.id); // rule 20
    await tx.user.update({ where: { id: user.id }, data: { guildLeftAt: new Date() } }); // rule 16
  });
  back(PAGE, "msg", "Guild-ээс гарлаа. 7 хоногийн дараа өөр guild-д нэгдэх боломжтой.");
}

export async function kickMember(fd: FormData) {
  const user = await student();
  const leader = await leaderOf(user.id);
  const targetId = int(fd, "userId");
  if (targetId === user.id) back(PAGE, "err", "Өөрийгөө хасах боломжгүй. Guild-ээс гарах товчийг ашиглана уу.");
  await prisma.$transaction((tx) => removeMember(tx, leader.guildId, targetId));
  back(PAGE, "msg", "Гишүүн хасагдлаа.");
}

export async function transferLeader(fd: FormData) {
  const user = await student();
  const leader = await leaderOf(user.id);
  const target = await prisma.guildMember.findUnique({ where: { userId: int(fd, "userId") } });
  if (!target || target.guildId !== leader.guildId) back(PAGE, "err", "Гишүүн олдсонгүй.");
  await prisma.$transaction([
    prisma.guildMember.update({ where: { userId: user.id }, data: { role: "MEMBER" } }),
    prisma.guildMember.update({ where: { userId: target.userId }, data: { role: "LEADER" } }),
  ]);
  back(PAGE, "msg", "Удирдагчийн эрх шилжлээ.");
}

export async function setGuildQuest(fd: FormData) {
  const user = await student();
  const leader = await leaderOf(user.id);
  const goalType = str(fd, "goalType");
  const taskType = str(fd, "taskType") || null;
  const target = int(fd, "targetValue");
  if (!(goalType in GOAL_TYPES)) back(PAGE, "err", "Зорилтын төрлийг сонгоно уу.");
  if (goalType === "COMPLETE_TYPE" && !(taskType && taskType in TASK_TYPES))
    back(PAGE, "err", "Даалгаврын төрлийг сонгоно уу.");

  const members = await prisma.guildMember.count({ where: { guildId: leader.guildId } });
  const min = minGuildQuestTarget(members); // rule 18
  if (!Number.isInteger(target) || target < min)
    back(PAGE, "err", `Зорилт хамгийн багадаа ${min} (гишүүн × 3) байна.`);

  const weekStart = weekStartKey();
  if (await prisma.guildQuest.findUnique({ where: { guildId_weekStart: { guildId: leader.guildId, weekStart } } }))
    back(PAGE, "err", "Энэ долоо хоногийн guild quest аль хэдийн тавигдсан.");

  const typeLabel = goalType === "COMPLETE_TYPE" ? ` (${TASK_TYPES[taskType as keyof typeof TASK_TYPES]})` : "";
  await prisma.guildQuest.create({
    data: {
      guildId: leader.guildId,
      title: `${GOAL_TYPES[goalType as keyof typeof GOAL_TYPES]}${typeLabel}: нийт ${target}`,
      goalType,
      taskType: goalType === "COMPLETE_TYPE" ? taskType : null,
      targetValue: target,
      weekStart,
    },
  });
  back(PAGE, "msg", "Энэ долоо хоногийн guild quest тавигдлаа.");
}
