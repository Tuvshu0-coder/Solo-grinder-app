// AI quiz engine (rules 23–30). Timing and scoring are enforced on the server.
import { Prisma } from "@prisma/client";
import { prisma, type Tx } from "./db";
import { checkAchievements, grantXp, updateLevel } from "./game";
import { aiConfigured, GeminiUnavailable, generateQuiz } from "./gemini";
import {
  normalizeKey,
  quizBlock,
  quizReward,
  QUIZ_GRACE_MS,
  QUIZ_OPTIONS,
  QUIZ_QUESTION_MS,
  QUIZ_QUESTIONS,
  QUIZ_REUSE_MS,
  shuffledOrder,
} from "./quiz-rules";
import { dayKey, dayStart } from "./time";

export class QuizError extends Error {}

export const UNAVAILABLE_MSG =
  "Тест одоогоор боломжгүй байна. Дуусгаснаас хойш 24 цагийн дотор дахин оролдоно уу.";

// ---------- Settings ----------

export async function aiEnabled(): Promise<boolean> {
  const s = await prisma.setting.findUnique({ where: { key: "aiQuizEnabled" } });
  return s?.value !== "0";
}

export async function setAiEnabled(on: boolean) {
  await prisma.setting.upsert({
    where: { key: "aiQuizEnabled" },
    update: { value: on ? "1" : "0" },
    create: { key: "aiQuizEnabled", value: on ? "1" : "0" },
  });
}

export async function quizzesToday(userId: number, now = new Date()): Promise<number> {
  return prisma.quizAttempt.count({ where: { userId, startedAt: { gte: dayStart(dayKey(now)) } } });
}

/** Why this task can't be quizzed right now, or null if it can. */
export async function quizBlockFor(userId: number, taskId: number, now = new Date()): Promise<string | null> {
  const task = await prisma.task.findFirst({ where: { id: taskId, subject: { userId } }, include: { quizAttempt: true } });
  if (!task) return "Даалгавар олдсонгүй.";
  return quizBlock({
    ...task,
    hasAttempt: !!task.quizAttempt,
    attemptsToday: await quizzesToday(userId, now),
    aiEnabled: await aiEnabled(),
    now,
  });
}

// ---------- Start ----------

/** Creates the attempt for a DONE task: reuses recent questions or asks Gemini (rules 24, 25, 28, 30). */
export async function startQuiz(userId: number, taskId: number, now = new Date()): Promise<number> {
  const blocked = await quizBlockFor(userId, taskId, now);
  if (blocked) throw new QuizError(blocked);

  const task = await prisma.task.findFirstOrThrow({ where: { id: taskId }, include: { subject: true } });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { level: true } });
  const subjectKey = normalizeKey(task.subject.name);
  const topicKey = normalizeKey(task.topic);
  const rank = user.level.rank;

  // Rule 28: reuse questions made for the same subject + topic in the last 30 days.
  const pool = await prisma.quizQuestion.findMany({
    where: { subjectKey, topicKey, isInvalid: false, createdAt: { gte: new Date(now.getTime() - QUIZ_REUSE_MS) } },
  });
  let questionIds: number[];
  if (pool.length >= QUIZ_QUESTIONS) {
    const sameRank = pool.filter((q) => q.rank === rank);
    const ordered = [...shuffle(sameRank), ...shuffle(pool.filter((q) => q.rank !== rank))];
    questionIds = ordered.slice(0, QUIZ_QUESTIONS).map((q) => q.id);
    await prisma.aiLog.create({ data: { kind: "REUSED", createdAt: now } });
  } else {
    if (!aiConfigured()) {
      await prisma.aiLog.create({ data: { kind: "ERROR", detail: "GEMINI_API_KEY тохируулаагүй", createdAt: now } });
      throw new QuizError(UNAVAILABLE_MSG);
    }
    let result;
    try {
      // Only subject, topic and rank leave the server (rule 24).
      result = await generateQuiz({ subject: task.subject.name, topic: task.topic, rank });
    } catch (e) {
      const detail = e instanceof GeminiUnavailable ? e.message : String(e);
      await prisma.aiLog.create({ data: { kind: "ERROR", detail: detail.slice(0, 300), createdAt: now } });
      throw new QuizError(UNAVAILABLE_MSG); // rule 30
    }
    if (!result.ok) {
      // Rule 25: off-topic or too general — no quiz, tell the student why.
      await prisma.task.update({ where: { id: task.id }, data: { quizBlockedReason: result.reason } });
      await prisma.aiLog.create({ data: { kind: "REJECTED_TOPIC", detail: result.reason.slice(0, 300), createdAt: now } });
      throw new QuizError(result.reason);
    }
    const created = await prisma.$transaction(
      result.questions.map((q) =>
        prisma.quizQuestion.create({
          data: { subjectKey, topicKey, rank, question: q.question, options: JSON.stringify(q.options), correctIndex: q.correctIndex, createdAt: now },
        }),
      ),
    );
    questionIds = created.map((q) => q.id);
    await prisma.aiLog.create({ data: { kind: "GENERATED", createdAt: now } });
  }

  try {
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        taskId: task.id,
        subjectName: task.subject.name,
        topic: task.topic,
        startedAt: now,
        answers: {
          create: questionIds.map((questionId, position) => ({
            questionId,
            position,
            optionOrder: JSON.stringify(shuffledOrder(QUIZ_OPTIONS)), // rule 26
          })),
        },
      },
    });
    return attempt.id;
  } catch (e) {
    // Double click: the other request already created it.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const a = await prisma.quizAttempt.findUniqueOrThrow({ where: { taskId: task.id } });
      return a.id;
    }
    throw e;
  }
}

function shuffle<T>(a: T[]): T[] {
  return shuffledOrder(a.length).map((i) => a[i]);
}

// ---------- Play ----------

export type ServeResult =
  | { done: true; score: number; xp: number }
  | {
      done: false;
      position: number;
      total: number;
      question: string;
      options: string[];
      remainingMs: number;
      /** outcome of questions closed since the last call (timeout / left the page) */
      missed: number;
    };

async function loadAttempt(tx: Tx, userId: number, attemptId: number) {
  const attempt = await tx.quizAttempt.findFirst({
    where: { id: attemptId, userId },
    include: { answers: { orderBy: { position: "asc" }, include: { question: true } } },
  });
  if (!attempt) throw new QuizError("Тест олдсонгүй.");
  return attempt;
}

/** Closes questions whose 30 seconds ran out (rule 26). Returns how many were closed. */
async function expireStale(tx: Tx, answers: { id: number; servedAt: Date | null; answeredAt: Date | null }[], now: Date) {
  let n = 0;
  for (const a of answers) {
    if (a.servedAt && !a.answeredAt && now.getTime() > a.servedAt.getTime() + QUIZ_QUESTION_MS + QUIZ_GRACE_MS) {
      await tx.quizAnswer.update({ where: { id: a.id }, data: { answeredAt: now, outcome: "TIMEOUT", isCorrect: false } });
      a.answeredAt = now;
      n++;
    }
  }
  return n;
}

/**
 * Returns the current question, starting its 30-second timer on first view.
 * Calling it again while the timer runs returns the same question with the time left (no reset).
 */
export async function serveQuestion(userId: number, attemptId: number, now = new Date()): Promise<ServeResult> {
  return prisma.$transaction(async (tx) => {
    const attempt = await loadAttempt(tx, userId, attemptId);
    if (attempt.status === "FINISHED") return { done: true, score: attempt.score, xp: attempt.xpEarned };
    const missed = await expireStale(tx, attempt.answers, now);

    const current = attempt.answers.find((a) => !a.answeredAt);
    if (!current) {
      const r = await finishAttempt(tx, attempt.id, now);
      return { done: true, ...r };
    }
    let servedAt = current.servedAt;
    if (!servedAt) {
      servedAt = now;
      await tx.quizAnswer.update({ where: { id: current.id }, data: { servedAt } });
    }
    const options: string[] = JSON.parse(current.question.options);
    const order: number[] = JSON.parse(current.optionOrder);
    return {
      done: false,
      position: current.position,
      total: attempt.answers.length,
      question: current.question.question,
      options: order.map((i) => options[i]),
      remainingMs: Math.max(0, servedAt.getTime() + QUIZ_QUESTION_MS - now.getTime()),
      missed,
    };
  });
}

export interface AnswerResult {
  outcome: "CORRECT" | "WRONG" | "TIMEOUT";
  correctDisplayIndex: number;
  finished: { score: number; xp: number } | null;
}

/** Records the answer for the question at `position`. `choice` is the display index, or null when time ran out. */
export async function answerQuestion(
  userId: number,
  attemptId: number,
  position: number,
  choice: number | null,
  now = new Date(),
): Promise<AnswerResult> {
  return prisma.$transaction(async (tx) => {
    const attempt = await loadAttempt(tx, userId, attemptId);
    if (attempt.status === "FINISHED") throw new QuizError("Тест дууссан.");
    const current = attempt.answers.find((a) => !a.answeredAt);
    // Rule 26: no going back — only the current, already shown question can be answered.
    if (!current || current.position !== position || !current.servedAt) throw new QuizError("Энэ асуултад хариулах боломжгүй.");

    const order: number[] = JSON.parse(current.optionOrder);
    const late = now.getTime() > current.servedAt.getTime() + QUIZ_QUESTION_MS + QUIZ_GRACE_MS;
    const valid = choice != null && Number.isInteger(choice) && choice >= 0 && choice < order.length;
    const chosenIndex = !late && valid ? order[choice] : null;
    const outcome = chosenIndex == null ? "TIMEOUT" : chosenIndex === current.question.correctIndex ? "CORRECT" : "WRONG";

    await tx.quizAnswer.update({
      where: { id: current.id },
      data: { answeredAt: now, chosenIndex, outcome, isCorrect: outcome === "CORRECT" },
    });

    const last = attempt.answers.every((a) => a.id === current.id || a.answeredAt);
    return {
      outcome,
      correctDisplayIndex: order.indexOf(current.question.correctIndex),
      finished: last ? await finishAttempt(tx, attempt.id, now) : null,
    };
  });
}

/** Rule 26: leaving the quiz page while a question is shown counts that question as wrong. */
export async function abandonQuestion(userId: number, attemptId: number, now = new Date()) {
  await prisma.$transaction(async (tx) => {
    const attempt = await loadAttempt(tx, userId, attemptId);
    if (attempt.status === "FINISHED") return;
    const current = attempt.answers.find((a) => !a.answeredAt);
    if (!current?.servedAt) return;
    await tx.quizAnswer.update({ where: { id: current.id }, data: { answeredAt: now, outcome: "LEFT", isCorrect: false } });
  });
}

/** Scores the attempt and grants the rule-27 bonus inside the 400/day cap. */
async function finishAttempt(tx: Tx, attemptId: number, now: Date): Promise<{ score: number; xp: number }> {
  const attempt = await tx.quizAttempt.findUniqueOrThrow({ where: { id: attemptId }, include: { answers: true } });
  if (attempt.status === "FINISHED") return { score: attempt.score, xp: attempt.xpEarned };
  const score = attempt.answers.filter((a) => a.isCorrect).length;
  await tx.quizAttempt.update({ where: { id: attemptId }, data: { status: "FINISHED", score, finishedAt: now } });
  const xp = await grantXp(tx, attempt.userId, quizReward(score), "AI_QUIZ", attemptId, now);
  await tx.quizAttempt.update({ where: { id: attemptId }, data: { xpEarned: xp } });
  await checkAchievements(tx, attempt.userId, now);
  await updateLevel(tx, attempt.userId);
  await checkAchievements(tx, attempt.userId, now); // LEVEL achievements after a level-up
  await updateLevel(tx, attempt.userId);
  return { score, xp };
}

// ---------- Reports (rule 29) ----------

export async function reportQuestion(userId: number, answerId: number, reason: string) {
  const answer = await prisma.quizAnswer.findFirst({
    where: { id: answerId, attempt: { userId } },
    include: { attempt: true, report: true },
  });
  if (!answer) throw new QuizError("Асуулт олдсонгүй.");
  if (answer.attempt.status !== "FINISHED") throw new QuizError("Тест дууссаны дараа мэдээлнэ үү.");
  if (answer.report) throw new QuizError("Энэ асуултыг аль хэдийн мэдээлсэн.");
  const text = reason.trim();
  if (text.length < 3 || text.length > 500) throw new QuizError("Шалтгааныг 3–500 тэмдэгтээр бичнэ үү.");
  await prisma.quizReport.create({ data: { answerId, userId, reason: text } });
}

/**
 * Admin decision. Accepting marks the question invalid (never reused) and counts the student's
 * answer as correct, granting the extra quiz XP (inside today's cap).
 */
export async function reviewReport(reportId: number, accept: boolean, now = new Date()): Promise<{ extraXp: number }> {
  return prisma.$transaction(async (tx) => {
    const report = await tx.quizReport.findUnique({ where: { id: reportId }, include: { answer: true } });
    if (!report) throw new QuizError("Мэдээлэл олдсонгүй.");
    if (report.status !== "PENDING") throw new QuizError("Энэ мэдээллийг аль хэдийн хянасан.");
    await tx.quizReport.update({ where: { id: reportId }, data: { status: accept ? "ACCEPTED" : "REJECTED", reviewedAt: now } });
    if (!accept) return { extraXp: 0 };

    await tx.quizQuestion.update({ where: { id: report.answer.questionId }, data: { isInvalid: true } });
    if (report.answer.isCorrect) return { extraXp: 0 };

    await tx.quizAnswer.update({ where: { id: report.answerId }, data: { isCorrect: true } });
    const attempt = await tx.quizAttempt.findUniqueOrThrow({ where: { id: report.answer.attemptId } });
    const score = attempt.score + 1;
    const extra = quizReward(score) - quizReward(attempt.score);
    const granted = await grantXp(tx, attempt.userId, extra, "AI_QUIZ", attempt.id, now);
    await tx.quizAttempt.update({ where: { id: attempt.id }, data: { score, xpEarned: attempt.xpEarned + granted } });
    await checkAchievements(tx, attempt.userId, now);
    await updateLevel(tx, attempt.userId);
    return { extraXp: granted };
  });
}
