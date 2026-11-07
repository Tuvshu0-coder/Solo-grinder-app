// Fills the "demo" account (password demo123) with realistic activity for demos and screenshots.
// Everything goes through the real game engine, so XP, quests, streak and achievements are consistent.
// Run: npm run db:demo   (resets only the demo user's own data)
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { completeTask, ensureDailyQuests } from "../src/lib/game";
import { DAY, HOUR } from "../src/lib/time";

const TYPES = ["HOMEWORK", "LAB", "INDEPENDENT", "EXAM_PREP", "READING"];
const TITLES = [
  "Лаб 3 — SQL JOIN", "ER диаграм зурах", "React компонент", "Интеграл бодлого", "Бие даалт 2",
  "Шалгалтын бэлтгэл — 1-р бүлэг", "Унших: 4-р бүлэг", "Лаб 4 — Индекс", "Форм validation", "Матриц бодлого",
];

async function main() {
  const now = Date.now();
  const user = await prisma.user.upsert({
    where: { username: "demo" },
    update: {},
    create: { username: "demo", password: await bcrypt.hash("demo123", 10) },
  });
  await prisma.subject.deleteMany({ where: { userId: user.id } });
  await prisma.xpLog.deleteMany({ where: { userId: user.id } });
  await prisma.dailyQuest.deleteMany({ where: { userId: user.id } });
  await prisma.userAchievement.deleteMany({ where: { userId: user.id } });
  await prisma.user.update({ where: { id: user.id }, data: { totalXp: 0, levelId: 1, streak: 0, lastActiveDate: null } });

  const subjects = [];
  for (const name of ["Өгөгдлийн сан", "Веб програмчлал", "Математик"]) {
    subjects.push(await prisma.subject.create({ data: { userId: user.id, name } }));
  }

  // 10 days of history: 1–3 completions per day, mostly early or on time, one late
  let k = 0;
  for (let d = 10; d >= 1; d--) {
    for (let i = 0; i < 1 + (d % 3); i++, k++) {
      const doneAt = new Date(now - d * DAY + (2 + i * 2) * HOUR);
      const created = new Date(doneAt.getTime() - (2 + (k % 3)) * DAY);
      const lateOne = k === 7;
      const deadline = lateOne ? new Date(doneAt.getTime() - 5 * HOUR) : new Date(created.getTime() + (k % 4 === 0 ? 2.4 : 6) * DAY);
      const t = await prisma.task.create({
        data: { subjectId: subjects[k % 3].id, title: TITLES[k % TITLES.length], type: TYPES[k % 5], createdAt: created, deadline },
      });
      await completeTask(user.id, t.id, doneAt);
    }
  }

  // today: quests first, then one early completion so today's progress shows
  await ensureDailyQuests(user.id);
  const t = await prisma.task.create({
    data: { subjectId: subjects[0].id, title: "Лаб 5 — Transaction", type: "LAB", createdAt: new Date(now - 3 * DAY), deadline: new Date(now + 4 * DAY) },
  });
  await completeTask(user.id, t.id);

  // open tasks: one due within 24h, one already late, three upcoming
  const open = [
    { title: "Бие даалт 3 — тайлан", type: "INDEPENDENT", s: 1, created: -2 * DAY, deadline: 5 * HOUR },
    { title: "Интеграл — дасгал 12", type: "HOMEWORK", s: 2, created: -4 * DAY, deadline: -20 * HOUR },
    { title: "Шалгалтын бэлтгэл — SQL", type: "EXAM_PREP", s: 0, created: -1 * DAY, deadline: 2 * DAY },
    { title: "Унших: React docs", type: "READING", s: 1, created: -1 * DAY, deadline: 4 * DAY + 6 * HOUR },
    { title: "Лаб 6 — Normalization", type: "LAB", s: 0, created: 0, deadline: 9 * DAY },
  ];
  for (const o of open) {
    await prisma.task.create({
      data: {
        subjectId: subjects[o.s].id, title: o.title, type: o.type,
        createdAt: new Date(now + o.created), deadline: new Date(now + o.deadline),
        status: o.deadline < 0 ? "LATE" : "TODO",
      },
    });
  }

  if (process.env.SHOT_SESSION) {
    const expiresAt = new Date(now + HOUR);
    await prisma.session.upsert({
      where: { id: process.env.SHOT_SESSION },
      update: { userId: user.id, expiresAt },
      create: { id: process.env.SHOT_SESSION, userId: user.id, expiresAt },
    });
  }
  const u = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  console.log(`demo ready: level ${u.levelId}, ${u.totalXp} XP, streak ${u.streak}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
