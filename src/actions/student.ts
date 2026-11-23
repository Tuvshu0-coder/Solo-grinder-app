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
  if (user.role !== "STUDENT") back("/admin", "err", "Students only.");
  return user;
}

// ---------- Subjects ----------

export async function addSubject(fd: FormData) {
  const user = await student();
  const name = str(fd, "name");
  if (!name || name.length > 60) back("/subjects", "err", "Subject name must be 1–60 characters.");
  await prisma.subject.create({ data: { userId: user.id, name } });
  revalidatePath("/subjects");
  back("/subjects", "msg", `Added subject "${name}".`);
}

export async function renameSubject(fd: FormData) {
  const user = await student();
  const name = str(fd, "name");
  if (!name || name.length > 60) back("/subjects", "err", "Subject name must be 1–60 characters.");
  await prisma.subject.updateMany({ where: { id: int(fd, "id"), userId: user.id }, data: { name } });
  back("/subjects", "msg", "Subject renamed.");
}

export async function deleteSubject(fd: FormData) {
  const user = await student();
  await prisma.subject.deleteMany({ where: { id: int(fd, "id"), userId: user.id } });
  back("/subjects", "msg", "Subject deleted. XP you earned stays.");
}

// ---------- Tasks ----------

export async function createTask(fd: FormData) {
  const user = await student();
  const subjectId = int(fd, "subjectId");
  const title = str(fd, "title");
  const type = str(fd, "type");
  const deadline = fromLocalInput(str(fd, "deadline"));

  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId: user.id } });
  if (!subject) back("/tasks", "err", "Every task must belong to a subject."); // rule 2
  if (!(type in TASK_TYPES)) back("/tasks", "err", "Choose a task type.");
  if (!title || title.length > 120) back("/tasks", "err", "Task name must be 1–120 characters.");
  const err = validateDeadline(deadline, new Date()); // rule 3
  if (err) back("/tasks", "err", err);

  await prisma.task.create({ data: { subjectId, title, type, deadline } });
  revalidatePath("/tasks");
  back("/tasks", "msg", `Added task "${title}".`);
}

export async function completeTaskAction(fd: FormData) {
  const user = await student();
  const returnTo = str(fd, "returnTo") || "/tasks";
  let text: string;
  try {
    const r = await completeTask(user.id, int(fd, "id"));
    const parts = [`+${r.granted} XP (${multiplierLabel(r.multiplier)})`];
    if (r.granted < r.baseXp) parts.push(`daily 400 XP cap reached, ${r.baseXp - r.granted} XP cut`);
    if (r.questsCompleted.length) parts.push(`Quests done: ${r.questsCompleted.join(", ")}`);
    if (r.achievementsUnlocked.length) parts.push(`Achievement: ${r.achievementsUnlocked.join(", ")}`);
    if (r.leveledUpTo) parts.push(`LEVEL UP → ${r.leveledUpTo}!`);
    if (r.guildQuestCompleted) parts.push("Guild quest done! +50 XP");
    text = parts.join(" · ");
  } catch (e) {
    back(returnTo, "err", e instanceof Error ? e.message : "Something went wrong.");
  }
  revalidatePath("/", "layout");
  back(returnTo, "msg", text);
}

export async function editDeadline(fd: FormData) {
  const user = await student();
  const task = await prisma.task.findFirst({ where: { id: int(fd, "id"), subject: { userId: user.id } } });
  if (!task) back("/tasks", "err", "Task not found.");
  const now = new Date();
  const notAllowed = canEditDeadline(task, now); // rule 4
  if (notAllowed) back("/tasks", "err", notAllowed);
  const deadline = fromLocalInput(str(fd, "deadline"));
  const err = validateDeadline(deadline, now);
  if (err) back("/tasks", "err", err);
  await prisma.task.update({ where: { id: task.id }, data: { deadline, deadlineEdited: true } });
  back("/tasks", "msg", "Deadline changed. This task now earns at most ×1.0.");
}

export async function deleteTask(fd: FormData) {
  const user = await student();
  await prisma.task.deleteMany({
    where: { id: int(fd, "id"), subject: { userId: user.id }, status: { not: "DONE" } },
  });
  back("/tasks", "msg", "Task deleted.");
}
