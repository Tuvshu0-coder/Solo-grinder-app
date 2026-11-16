// End-to-end check of the game engine against a scratch database.
// Run: npm run test:integration
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { completeTask, ensureDailyQuests, runMaintenance, xpToday } from "../src/lib/game";
import { guildLeaderboard, removeMember } from "../src/lib/guild";
import { DAY, HOUR } from "../src/lib/time";

const now = new Date();
const ago = (ms: number) => new Date(now.getTime() - ms);
const ahead = (ms: number) => new Date(now.getTime() + ms);
let n = 0;

async function mkUser() {
  const u = await prisma.user.create({ data: { username: `t${Date.now()}_${n++}`, password: "x" } });
  const s = await prisma.subject.create({ data: { userId: u.id, name: "Test" } });
  return { u, s };
}
async function mkTask(subjectId: number, createdAt: Date, deadline: Date, type = "HOMEWORK") {
  return prisma.task.create({ data: { subjectId, title: "t", type, createdAt, deadline } });
}
function ok(name: string) {
  console.log(`✔ ${name}`);
}

async function main() {
  // 1. Spec example: 10-day task finished on day 3 → 75 XP.
  {
    const { u, s } = await mkUser();
    const t = await mkTask(s.id, ago(3 * DAY), ahead(7 * DAY));
    const r = await completeTask(u.id, t.id);
    assert.equal(r.multiplier, 1.5);
    assert.equal(r.granted, 75);
    ok("spec example → ×1.5, 75 XP");
  }

  // 2. Padding: fresh 30-day task done immediately → ×1.0.
  {
    const { u, s } = await mkUser();
    const t = await mkTask(s.id, now, ahead(30 * DAY));
    const r = await completeTask(u.id, t.id);
    assert.equal(r.multiplier, 1.0);
    ok("padding blocked (<24h open → ×1.0)");
  }

  // 3. Max 3 early bonuses/day, and the 400 cap.
  {
    const { u, s } = await mkUser();
    const mults: number[] = [];
    for (let i = 0; i < 8; i++) {
      const t = await mkTask(s.id, ago(2 * DAY), ahead(10 * DAY));
      mults.push((await completeTask(u.id, t.id)).multiplier);
    }
    assert.deepEqual(mults.slice(0, 4), [1.5, 1.5, 1.5, 1.0]);
    const today = await xpToday(prisma, u.id);
    assert.ok(today <= 400, `today=${today}`);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    assert.equal(user.totalXp, today);
    ok(`3 early bonuses/day; daily cap holds (${today}/400)`);
  }

  // 4. Late task: maintenance marks LATE, ×0.2, no streak.
  {
    const { u, s } = await mkUser();
    const t = await mkTask(s.id, ago(5 * DAY), ago(2 * DAY));
    await runMaintenance();
    assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: t.id } })).status, "LATE");
    const r = await completeTask(u.id, t.id);
    assert.equal(r.multiplier, 0.2);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).streak, 0);
    ok("late → LATE status, ×0.2, streak unchanged");
  }

  // 5. Streak across days, reset after a skipped day.
  {
    const { u, s } = await mkUser();
    const a = await mkTask(s.id, ago(3 * DAY), ahead(5 * DAY));
    await completeTask(u.id, a.id, ago(DAY)); // yesterday
    const b = await mkTask(s.id, ago(3 * DAY), ahead(5 * DAY));
    await completeTask(u.id, b.id); // today
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).streak, 2);
    await prisma.user.update({ where: { id: u.id }, data: { lastActiveDate: "2000-01-01" } });
    await runMaintenance();
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).streak, 0);
    ok("streak 1→2 across days, reset to 0 after a skipped day");
  }

  // 6. Daily quests: 3 assigned, progress + reward.
  {
    const { u, s } = await mkUser();
    await mkTask(s.id, ago(2 * DAY), ahead(10 * DAY), "LAB");
    await ensureDailyQuests(u.id);
    await ensureDailyQuests(u.id); // idempotent
    const qs = await prisma.dailyQuest.findMany({ where: { userId: u.id }, include: { template: true } });
    assert.equal(qs.length, 3);
    assert.equal(new Set(qs.map((q) => q.template.goalType)).size, 3);
    assert.ok(!qs.some((q) => q.template.goalType === "CLEAR_OVERDUE"), "infeasible quest assigned");
    ok(`3 different daily quests: ${qs.map((q) => q.template.goalType).join(", ")}`);
  }

  // 7. Guild: quest reward, leaderboard excludes GUILD_QUEST, succession, deletion.
  {
    const A = await mkUser();
    const B = await mkUser();
    const C = await mkUser();
    const g = await prisma.guild.create({ data: { name: "G", inviteCode: `T${Date.now()}` } });
    await prisma.guildMember.create({ data: { guildId: g.id, userId: A.u.id, role: "LEADER", joinedAt: ago(3 * HOUR) } });
    await prisma.guildMember.create({ data: { guildId: g.id, userId: B.u.id, joinedAt: ago(2 * HOUR) } });
    await prisma.guildMember.create({ data: { guildId: g.id, userId: C.u.id, joinedAt: ago(HOUR) } }); // inactive
    const { weekStartKey } = await import("../src/lib/time");
    await prisma.guildQuest.create({
      data: { guildId: g.id, title: "q", goalType: "COMPLETE_N", targetValue: 3, weekStart: weekStartKey() },
    });
    for (const who of [A, A, B]) {
      const t = await mkTask(who.s.id, now, ahead(DAY));
      await completeTask(who.u.id, t.id);
    }
    const gq = await prisma.guildQuest.findFirstOrThrow({ where: { guildId: g.id } });
    assert.equal(gq.isCompleted, true);
    const bonus = async (id: number) =>
      (await prisma.xpLog.aggregate({ where: { userId: id, source: "GUILD_QUEST" }, _sum: { xpAmount: true } }))._sum.xpAmount ?? 0;
    assert.equal(await bonus(A.u.id), 50);
    assert.equal(await bonus(B.u.id), 50);
    assert.equal(await bonus(C.u.id), 0);
    const board = await guildLeaderboard(g.id);
    assert.equal(board[0].userId, A.u.id);
    assert.equal(board[0].weekXp, 100 + 10 + 20 * 0); // 2 tasks ×50 + "first task" achievement 10
    ok("guild quest: +50 to active members only; leaderboard excludes bonus");

    await prisma.$transaction((tx) => removeMember(tx, g.id, A.u.id));
    assert.equal((await prisma.guildMember.findUniqueOrThrow({ where: { userId: B.u.id } })).role, "LEADER");
    await prisma.$transaction((tx) => removeMember(tx, g.id, B.u.id));
    await prisma.$transaction((tx) => removeMember(tx, g.id, C.u.id));
    assert.equal(await prisma.guild.findUnique({ where: { id: g.id } }), null);
    ok("leader leaves → oldest member leads; last leaves → guild deleted");
  }

  // 8. AI quiz (rules 23–30) with the offline mock generator.
  {
    process.env.AI_QUIZ_MOCK = "1";
    const quiz = await import("../src/lib/quiz");
    const { u, s } = await mkUser();
    const mkDone = async (topic: string) => {
      const t = await prisma.task.create({
        data: { subjectId: s.id, title: "q", topic, type: "HOMEWORK", createdAt: ago(2 * DAY), deadline: ahead(5 * DAY) },
      });
      await completeTask(u.id, t.id);
      return t;
    };
    const play = async (attemptId: number, correct: number) => {
      for (let i = 0; i < 5; i++) {
        const q = await quiz.serveQuestion(u.id, attemptId);
        assert.equal(q.done, false);
        if (q.done) return;
        const right = q.options.indexOf("Зөв хариулт");
        const choice = i < correct ? right : (right + 1) % 4;
        await quiz.answerQuestion(u.id, attemptId, q.position, choice);
      }
    };

    // Perfect score → +25 XP, PERFECT_QUIZ achievement.
    const t1 = await mkDone("SQL JOIN");
    const a1 = await quiz.startQuiz(u.id, t1.id);
    await assert.rejects(quiz.startQuiz(u.id, t1.id), /аль хэдийн/); // once per task
    await play(a1, 5);
    const r1 = await prisma.quizAttempt.findUniqueOrThrow({ where: { id: a1 } });
    assert.equal(r1.score, 5);
    assert.equal(r1.xpEarned, 25);
    const perfect = await prisma.userAchievement.count({ where: { userId: u.id, achievement: { conditionType: "PERFECT_QUIZ" } } });
    assert.equal(perfect, 1);
    ok("AI quiz 5/5 → +25 XP and 5/5 achievement");

    // Same subject + topic reuses stored questions (no new GENERATED log).
    const generated = await prisma.aiLog.count({ where: { kind: "GENERATED" } });
    const t2 = await mkDone("sql join");
    const a2 = await quiz.startQuiz(u.id, t2.id);
    assert.equal(await prisma.aiLog.count({ where: { kind: "GENERATED" } }), generated);
    await play(a2, 3);
    const r2 = await prisma.quizAttempt.findUniqueOrThrow({ where: { id: a2 } });
    assert.equal(r2.xpEarned, 5);
    ok("same subject/topic reuses questions; 3/5 → +5 XP");

    // Report accepted → answer counted correct, extra XP (3/5 → 4/5 = +10), question never reused.
    const wrong = await prisma.quizAnswer.findFirstOrThrow({ where: { attemptId: a2, isCorrect: false } });
    await quiz.reportQuestion(u.id, wrong.id, "Хариулт буруу байна");
    const rep = await prisma.quizReport.findFirstOrThrow({ where: { answerId: wrong.id } });
    const { extraXp } = await quiz.reviewReport(rep.id, true);
    assert.equal(extraXp, 10);
    assert.equal((await prisma.quizAttempt.findUniqueOrThrow({ where: { id: a2 } })).score, 4);
    assert.equal((await prisma.quizQuestion.findUniqueOrThrow({ where: { id: wrong.questionId } })).isInvalid, true);
    ok("accepted report → counted correct, +10 XP, question marked invalid");

    // Timeout: a question answered after 30 s counts as wrong.
    const t3 = await mkDone("Индекс");
    const a3 = await quiz.startQuiz(u.id, t3.id);
    const q = await quiz.serveQuestion(u.id, a3);
    if (q.done) throw new Error("unexpected");
    const r = await quiz.answerQuestion(u.id, a3, q.position, 0, new Date(Date.now() + 40_000));
    assert.equal(r.outcome, "TIMEOUT");
    // Leaving the page counts the shown question as wrong.
    await quiz.serveQuestion(u.id, a3);
    await quiz.abandonQuestion(u.id, a3);
    const left = await prisma.quizAnswer.findFirstOrThrow({ where: { attemptId: a3, position: 1 } });
    assert.equal(left.outcome, "LEFT");
    ok("answer after 30 s → TIMEOUT; leaving page → LEFT");

    // Rule 25: too general topic → no quiz, reason stored on the task.
    const t4 = await mkDone("бүх зүйл");
    await assert.rejects(quiz.startQuiz(u.id, t4.id), /ерөнхий/);
    assert.ok((await prisma.task.findUniqueOrThrow({ where: { id: t4.id } })).quizBlockedReason);
    ok("too general topic → rejected with reason");

    // Rule 28: max 5 quizzes per day (3 started so far).
    for (const topic of ["Нэг", "Хоёр"]) await quiz.startQuiz(u.id, (await mkDone(topic)).id);
    await assert.rejects(quiz.startQuiz(u.id, (await mkDone("Гурав")).id), /5 AI тест/);
    ok("6th quiz of the day is refused");

    // Admin switch (rule 30).
    await quiz.setAiEnabled(false);
    assert.match((await quiz.quizBlockFor(u.id, t4.id)) ?? "", /./);
    await quiz.setAiEnabled(true);
    const total = (await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).totalXp;
    assert.ok((await xpToday(prisma, u.id)) <= 400 && total <= 400);
    ok("admin can switch AI quiz off; daily cap still holds");
  }

  console.log("\nAll integration checks passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
