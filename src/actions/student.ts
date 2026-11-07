"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { completeTask } from "@/lib/game";
import { canEditDeadline, validateDeadline } from "@/lib/rules";
import { TASK_TYPES, multiplierLabel } from "@/lib/labels";
import { fromLocalInput } from "@/lib/time";
import { back, int, str } from "./util";

async function student() {
  const user = await requireUser();
  if (user.role !== "STUDENT") back("/admin", "err", "Зөвхөн оюутан хэрэглэгч.");
  return user;
}

// ---------- Subjects ----------

export async function addSubject(fd: FormData) {
  const user = await student();
  const name = str(fd, "name");
  if (!name || name.length > 60) back("/subjects", "err", "Хичээлийн нэр 1–60 тэмдэгт байна.");
  await prisma.subject.create({ data: { userId: user.id, name } });
  revalidatePath("/subjects");
  back("/subjects", "msg", `"${name}" хичээл нэмэгдлээ.`);
}

export async function renameSubject(fd: FormData) {
  const user = await student();
  const name = str(fd, "name");
  if (!name || name.length > 60) back("/subjects", "err", "Хичээлийн нэр 1–60 тэмдэгт байна.");
  await prisma.subject.updateMany({ where: { id: int(fd, "id"), userId: user.id }, data: { name } });
  back("/subjects", "msg", "Хичээлийн нэр шинэчлэгдлээ.");
}

export async function deleteSubject(fd: FormData) {
  const user = await student();
  await prisma.subject.deleteMany({ where: { id: int(fd, "id"), userId: user.id } });
  back("/subjects", "msg", "Хичээл устгагдлаа. Авсан XP хэвээр үлдэнэ.");
}

// ---------- Tasks ----------

export async function createTask(fd: FormData) {
  const user = await student();
  const subjectId = int(fd, "subjectId");
  const title = str(fd, "title");
  const type = str(fd, "type");
  const deadline = fromLocalInput(str(fd, "deadline"));

  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId: user.id } });
  if (!subject) back("/tasks", "err", "Даалгавар заавал нэг хичээлд харьяалагдана."); // rule 2
  if (!(type in TASK_TYPES)) back("/tasks", "err", "Даалгаврын төрлийг сонгоно уу.");
  if (!title || title.length > 120) back("/tasks", "err", "Даалгаврын нэр 1–120 тэмдэгт байна.");
  const err = validateDeadline(deadline, new Date()); // rule 3
  if (err) back("/tasks", "err", err);

  await prisma.task.create({ data: { subjectId, title, type, deadline } });
  revalidatePath("/tasks");
  back("/tasks", "msg", `"${title}" даалгавар нэмэгдлээ.`);
}

export async function completeTaskAction(fd: FormData) {
  const user = await student();
  const returnTo = str(fd, "returnTo") || "/tasks";
  let text: string;
  try {
    const r = await completeTask(user.id, int(fd, "id"));
    const parts = [`+${r.granted} XP (${multiplierLabel(r.multiplier)})`];
    if (r.granted < r.baseXp) parts.push(`өдрийн 400 XP хязгаарт хүрсэн тул ${r.baseXp - r.granted} XP тасарсан`);
    if (r.questsCompleted.length) parts.push(`Quest биелсэн: ${r.questsCompleted.join(", ")}`);
    if (r.achievementsUnlocked.length) parts.push(`Achievement: ${r.achievementsUnlocked.join(", ")}`);
    if (r.leveledUpTo) parts.push(`LEVEL UP → ${r.leveledUpTo}!`);
    if (r.guildQuestCompleted) parts.push("Guild quest биелсэн! +50 XP");
    text = parts.join(" · ");
  } catch (e) {
    back(returnTo, "err", e instanceof Error ? e.message : "Алдаа гарлаа.");
  }
  revalidatePath("/", "layout");
  back(returnTo, "msg", text);
}

export async function editDeadline(fd: FormData) {
  const user = await student();
  const task = await prisma.task.findFirst({ where: { id: int(fd, "id"), subject: { userId: user.id } } });
  if (!task) back("/tasks", "err", "Даалгавар олдсонгүй.");
  const now = new Date();
  const notAllowed = canEditDeadline(task, now); // rule 4
  if (notAllowed) back("/tasks", "err", notAllowed);
  const deadline = fromLocalInput(str(fd, "deadline"));
  const err = validateDeadline(deadline, now);
  if (err) back("/tasks", "err", err);
  await prisma.task.update({ where: { id: task.id }, data: { deadline, deadlineEdited: true } });
  back("/tasks", "msg", "Deadline өөрчлөгдлөө. Энэ даалгаврын үржвэр хамгийн ихдээ ×1.0 болно.");
}

export async function deleteTask(fd: FormData) {
  const user = await student();
  await prisma.task.deleteMany({
    where: { id: int(fd, "id"), subject: { userId: user.id }, status: { not: "DONE" } },
  });
  back("/tasks", "msg", "Даалгавар устгагдлаа.");
}
