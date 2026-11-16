"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  answerQuestion,
  QuizError,
  reportQuestion,
  serveQuestion,
  startQuiz,
  type AnswerResult,
  type ServeResult,
} from "@/lib/quiz";
import { back, int, str } from "./util";

async function student() {
  const user = await requireUser();
  if (user.role !== "STUDENT") back("/admin", "err", "Зөвхөн оюутан хэрэглэгч.");
  return user;
}

function message(e: unknown): string {
  if (e instanceof QuizError) return e.message;
  console.error(e);
  return "Алдаа гарлаа. Дахин оролдоно уу.";
}

export async function startQuizAction(fd: FormData) {
  const user = await student();
  const taskId = int(fd, "taskId");
  try {
    await startQuiz(user.id, taskId);
  } catch (e) {
    back(`/quiz/${taskId}`, "err", message(e));
  }
  redirect(`/quiz/${taskId}`);
}

export async function serveAction(attemptId: number): Promise<ServeResult | { error: string }> {
  const user = await student();
  try {
    return await serveQuestion(user.id, attemptId);
  } catch (e) {
    return { error: message(e) };
  }
}

export async function answerAction(
  attemptId: number,
  position: number,
  choice: number | null,
): Promise<AnswerResult | { error: string }> {
  const user = await student();
  try {
    const r = await answerQuestion(user.id, attemptId, position, choice);
    if (r.finished) revalidatePath("/", "layout");
    return r;
  } catch (e) {
    return { error: message(e) };
  }
}

export async function reportAction(fd: FormData) {
  const user = await student();
  const taskId = int(fd, "taskId");
  try {
    await reportQuestion(user.id, int(fd, "answerId"), str(fd, "reason"));
  } catch (e) {
    back(`/quiz/${taskId}`, "err", message(e));
  }
  back(`/quiz/${taskId}`, "msg", "Мэдээлэл илгээгдлээ. Админ хянаад буруу гэж үзвэл зөвд тооцож XP олгоно.");
}
