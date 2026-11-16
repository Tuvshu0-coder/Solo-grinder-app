// Pure AI-quiz rules (section 8, rules 23–30). No database access — unit-testable.
import { DAY, HOUR } from "./time";

export const QUIZ_QUESTIONS = 5; // rule 24
export const QUIZ_OPTIONS = 4; // rule 24
export const QUIZ_WINDOW_MS = 24 * HOUR; // rule 23: within 24h of completing the task
export const QUIZ_QUESTION_MS = 30_000; // rule 26
export const QUIZ_GRACE_MS = 2_000; // network slack on top of the 30 seconds
export const QUIZ_PER_DAY = 5; // rule 28
export const QUIZ_REUSE_MS = 30 * DAY; // rule 28
export const TOPIC_MIN = 2; // rule 2
export const TOPIC_MAX = 100; // rule 2

/** Rule 27: bonus XP for the number of correct answers. Wrong answers never subtract. */
export function quizReward(correct: number): number {
  if (correct >= 5) return 25;
  if (correct === 4) return 15;
  if (correct === 3) return 5;
  return 0;
}

export function quizGrade(correct: number): string {
  if (correct >= 5) return "Онц";
  if (correct === 4) return "Сайн";
  if (correct === 3) return "Дунд";
  return "Хангалтгүй";
}

/** Rule 2: topic must be 2–100 characters. */
export function validateTopic(topic: string): string | null {
  const n = [...topic].length;
  if (n < TOPIC_MIN || n > TOPIC_MAX) return `Хичээлийн сэдэв ${TOPIC_MIN}–${TOPIC_MAX} тэмдэгт байна.`;
  return null;
}

/** Key used to find reusable questions for "the same subject and topic" (rule 28). */
export function normalizeKey(s: string): string {
  return s.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Random permutation of 0..n-1 (rule 26: option order is shuffled). */
export function shuffledOrder(n: number, rand: () => number = Math.random): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface QuizEligibilityInput {
  status: string;
  completedAt: Date | null;
  topic: string;
  quizBlockedReason: string | null;
  hasAttempt: boolean;
  attemptsToday: number;
  aiEnabled: boolean;
  now: Date;
}

/** Rules 23, 25, 28, 30: can the student start an AI quiz for this task now? Returns a reason or null. */
export function quizBlock(t: QuizEligibilityInput): string | null {
  if (t.hasAttempt) return "Энэ даалгаврын AI тестийг аль хэдийн өгсөн.";
  if (t.status !== "DONE" || !t.completedAt) return "AI тестийг зөвхөн дууссан даалгаварт өгнө.";
  if (t.now.getTime() - t.completedAt.getTime() > QUIZ_WINDOW_MS)
    return "Дуусгаснаас хойш 24 цаг өнгөрсөн тул AI тест өгөх боломжгүй.";
  if (validateTopic(t.topic)) return "Даалгаварт хичээлийн сэдэв оруулаагүй тул AI тест үүсгэх боломжгүй.";
  if (t.quizBlockedReason) return t.quizBlockedReason;
  if (!t.aiEnabled) return "AI тест одоогоор түр унтарсан байна.";
  if (t.attemptsToday >= QUIZ_PER_DAY) return `Өдөрт хамгийн ихдээ ${QUIZ_PER_DAY} AI тест өгнө.`;
  return null;
}

/** Validates the question set Gemini returns. Returns null if unusable. */
export function cleanQuestions(raw: unknown): { question: string; options: string[]; correctIndex: number }[] | null {
  if (!Array.isArray(raw) || raw.length < QUIZ_QUESTIONS) return null;
  const out = [];
  for (const q of raw.slice(0, QUIZ_QUESTIONS)) {
    if (!q || typeof q !== "object") return null;
    const { question, options, correctIndex } = q as Record<string, unknown>;
    if (typeof question !== "string" || !question.trim()) return null;
    if (!Array.isArray(options) || options.length !== QUIZ_OPTIONS) return null;
    const opts = options.map((o) => (typeof o === "string" ? o.trim() : ""));
    if (opts.some((o) => !o) || new Set(opts).size !== QUIZ_OPTIONS) return null;
    if (typeof correctIndex !== "number" || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= QUIZ_OPTIONS)
      return null;
    out.push({ question: question.trim(), options: opts, correctIndex });
  }
  return out;
}
