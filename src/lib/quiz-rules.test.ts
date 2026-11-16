import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanQuestions, normalizeKey, quizBlock, quizReward, shuffledOrder, validateTopic } from "./quiz-rules";
import { HOUR } from "./time";

test("rule 27: quiz reward table", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(quizReward), [0, 0, 0, 5, 15, 25]);
});

test("rule 2: topic 2–100 characters", () => {
  assert.ok(validateTopic("а"));
  assert.equal(validateTopic("SQL"), null);
  assert.equal(validateTopic("ж".repeat(100)), null);
  assert.ok(validateTopic("ж".repeat(101)));
});

test("rule 28: same subject/topic key ignores case and punctuation", () => {
  assert.equal(normalizeKey("  SQL JOIN!! "), normalizeKey("sql, join"));
  assert.equal(normalizeKey("Өгөгдлийн сан"), "өгөгдлийн сан");
});

test("rule 26: option order is a permutation", () => {
  const p = shuffledOrder(4);
  assert.deepEqual([...p].sort(), [0, 1, 2, 3]);
});

const now = new Date("2026-11-16T12:00:00Z");
const ok = {
  status: "DONE",
  completedAt: new Date(now.getTime() - HOUR),
  topic: "SQL JOIN",
  quizBlockedReason: null,
  hasAttempt: false,
  attemptsToday: 0,
  aiEnabled: true,
  now,
};

test("rules 23/25/28/30: quiz eligibility", () => {
  assert.equal(quizBlock(ok), null);
  assert.ok(quizBlock({ ...ok, status: "TODO", completedAt: null }), "not done");
  assert.ok(quizBlock({ ...ok, completedAt: new Date(now.getTime() - 25 * HOUR) }), "older than 24h");
  assert.ok(quizBlock({ ...ok, hasAttempt: true }), "once per task");
  assert.ok(quizBlock({ ...ok, attemptsToday: 5 }), "5 per day");
  assert.ok(quizBlock({ ...ok, aiEnabled: false }), "admin switched off");
  assert.ok(quizBlock({ ...ok, topic: "" }), "no topic");
  assert.ok(quizBlock({ ...ok, quizBlockedReason: "хэт ерөнхий" }), "rejected topic");
});

test("Gemini output validation", () => {
  const q = { question: "?", options: ["a", "b", "c", "d"], correctIndex: 2 };
  assert.equal(cleanQuestions([q, q, q, q, q])?.length, 5);
  assert.equal(cleanQuestions([q, q, q, q]), null);
  assert.equal(cleanQuestions([q, q, q, q, { ...q, correctIndex: 4 }]), null);
  assert.equal(cleanQuestions([q, q, q, q, { ...q, options: ["a", "a", "b", "c"] }]), null);
});
