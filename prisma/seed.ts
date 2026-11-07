import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultMinXp } from "../src/lib/rules";
import { rankForLevel, TASK_TYPES } from "../src/lib/labels";

const prisma = new PrismaClient();

async function main() {
  // Levels 1–60, default curve 20 * L^2 (rule 21).
  for (let id = 1; id <= 60; id++) {
    await prisma.level.upsert({
      where: { id },
      update: {},
      create: { id, minXp: defaultMinXp(id), rank: rankForLevel(id) },
    });
  }

  if ((await prisma.questTemplate.count()) === 0) {
    await prisma.questTemplate.createMany({
      data: [
        { title: "Өнөөдөр 2 даалгавар дуусга", goalType: "COMPLETE_N", targetValue: 2, xpReward: 20 },
        { title: "Өнөөдөр 1 даалгавар дуусга", goalType: "COMPLETE_N", targetValue: 1, xpReward: 20 },
        { title: "1 даалгаврыг ×1.2 буюу түүнээс дээш үржвэртэй дуусга", goalType: "COMPLETE_EARLY", targetValue: 1, xpReward: 30 },
        { title: "Хоцорсон төлөвтэй 1 даалгавар дуусга", goalType: "CLEAR_OVERDUE", targetValue: 1, xpReward: 20 },
        ...Object.entries(TASK_TYPES).map(([type, label]) => ({
          title: `1 "${label}" даалгавар дуусга`,
          goalType: "COMPLETE_TYPE",
          taskType: type,
          targetValue: 1,
          xpReward: 20,
        })),
      ],
    });
  }

  if ((await prisma.achievement.count()) === 0) {
    await prisma.achievement.createMany({
      data: [
        { name: "Эхлэл", description: "3 хоногийн streak", conditionType: "STREAK", threshold: 3, xpReward: 20 },
        { name: "Долоо хоног", description: "7 хоногийн streak", conditionType: "STREAK", threshold: 7, xpReward: 50 },
        { name: "Хоёр долоо хоног", description: "14 хоногийн streak", conditionType: "STREAK", threshold: 14, xpReward: 100 },
        { name: "Сарын тэвчээр", description: "30 хоногийн streak", conditionType: "STREAK", threshold: 30, xpReward: 200 },
        { name: "Анхны алхам", description: "Анхны даалгавраа дуусга", conditionType: "TASKS_DONE", threshold: 1, xpReward: 10 },
        { name: "Хөдөлмөрч", description: "50 даалгавар дуусга", conditionType: "TASKS_DONE", threshold: 50, xpReward: 100 },
        { name: "Эрт шувуу", description: "10 даалгаврыг эрт дуусга", conditionType: "EARLY_TASKS", threshold: 10, xpReward: 50 },
        { name: "D rank", description: "Level 10-д хүр", conditionType: "LEVEL", threshold: 10, xpReward: 50 },
      ],
    });
  }

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", password: await bcrypt.hash("admin123", 10), role: "ADMIN" },
  });

  console.log("Seed done. Admin login: admin / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
