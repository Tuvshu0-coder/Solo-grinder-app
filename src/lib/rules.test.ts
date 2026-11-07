import { test } from "node:test";
import assert from "node:assert/strict";
import { canEditDeadline, capXp, computeMultiplier, defaultMinXp, nextStreak, validateDeadline } from "./rules";
import { DAY, HOUR, dayKey, weekStartKey } from "./time";

const t0 = new Date("2026-11-01T00:00:00Z");
const at = (ms: number) => new Date(t0.getTime() + ms);
const base = { createdAt: t0, deadlineEdited: false, earlyBonusesUsedToday: 0 };

test("spec example: 10-day deadline done on day 3 → ×1.5", () => {
  assert.equal(computeMultiplier({ ...base, deadline: at(10 * DAY), now: at(3 * DAY) }), 1.5);
});

test("20–50% left → ×1.2; <20% → ×1.0", () => {
  assert.equal(computeMultiplier({ ...base, deadline: at(10 * DAY), now: at(6 * DAY) }), 1.2);
  assert.equal(computeMultiplier({ ...base, deadline: at(10 * DAY), now: at(9 * DAY) }), 1.0);
});

test("late within 24h → ×0.5, beyond → ×0.2", () => {
  assert.equal(computeMultiplier({ ...base, deadline: at(DAY), now: at(DAY + 2 * HOUR) }), 0.5);
  assert.equal(computeMultiplier({ ...base, deadline: at(DAY), now: at(3 * DAY) }), 0.2);
});

test("rule 7: open < 24h → no early bonus (padding)", () => {
  assert.equal(computeMultiplier({ ...base, deadline: at(30 * DAY), now: at(31 * 60 * 1000) }), 1.0);
  assert.equal(computeMultiplier({ ...base, deadline: at(30 * DAY), now: at(23 * HOUR) }), 1.0);
  assert.equal(computeMultiplier({ ...base, deadline: at(30 * DAY), now: at(25 * HOUR) }), 1.5);
});

test("rule 8: 4th early task of the day → ×1.0", () => {
  assert.equal(computeMultiplier({ ...base, deadline: at(10 * DAY), now: at(2 * DAY), earlyBonusesUsedToday: 3 }), 1.0);
});

test("rule 4: edited deadline caps at ×1.0 but late penalties still apply", () => {
  assert.equal(computeMultiplier({ ...base, deadlineEdited: true, deadline: at(10 * DAY), now: at(2 * DAY) }), 1.0);
  assert.equal(computeMultiplier({ ...base, deadlineEdited: true, deadline: at(DAY), now: at(3 * DAY) }), 0.2);
});

test("rule 9: daily cap", () => {
  assert.equal(capXp(75, 380), 20);
  assert.equal(capXp(75, 400), 0);
  assert.equal(capXp(50, 0), 50);
});

test("rule 3 and 4: deadline validation and edit window", () => {
  assert.ok(validateDeadline(at(2 * HOUR), t0));
  assert.equal(validateDeadline(at(3 * HOUR), t0), null);
  assert.ok(validateDeadline(at(31 * DAY), t0));
  const task = { deadline: at(2 * DAY), deadlineEdited: false, status: "TODO" };
  assert.equal(canEditDeadline(task, t0), null);
  assert.ok(canEditDeadline(task, at(DAY + HOUR)));
  assert.ok(canEditDeadline({ ...task, deadlineEdited: true }, t0));
});

test("rule 12: streak", () => {
  assert.equal(nextStreak(4, "2026-11-06", "2026-11-07", "2026-11-06"), 5);
  assert.equal(nextStreak(4, "2026-11-07", "2026-11-07", "2026-11-06"), 4);
  assert.equal(nextStreak(4, "2026-11-04", "2026-11-07", "2026-11-06"), 1);
});

test("rule 21: level curve 20·L²", () => {
  assert.equal(defaultMinXp(1), 0);
  assert.equal(defaultMinXp(10), 2000);
  assert.equal(defaultMinXp(50), 50000);
});

test("Mongolia time boundaries", () => {
  assert.equal(dayKey(new Date("2026-11-07T15:59:00Z")), "2026-11-07");
  assert.equal(dayKey(new Date("2026-11-07T16:00:00Z")), "2026-11-08"); // 00:00 UTC+8
  assert.equal(weekStartKey(new Date("2026-11-07T12:00:00Z")), "2026-11-02"); // Sat → Mon
  assert.equal(weekStartKey(new Date("2026-11-08T17:00:00Z")), "2026-11-09"); // Mon 01:00 MN
});
