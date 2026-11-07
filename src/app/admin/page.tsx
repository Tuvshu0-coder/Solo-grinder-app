import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { DAY, dayKey, dayStart } from "@/lib/time";
import { Flash, PageTitle, type SP } from "@/components/ui";

export default async function AdminStats({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const weekAgo = new Date(Date.now() - 7 * DAY);
  const todayStart = dayStart(dayKey());

  const [students, suspended, activeIds, guilds, doneTasks, doneToday, lateTasks, xp] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "STUDENT", isSuspended: true } }),
    prisma.xpLog.findMany({ where: { createdAt: { gte: weekAgo }, source: "TASK" }, distinct: ["userId"], select: { userId: true } }),
    prisma.guild.count(),
    prisma.task.count({ where: { status: "DONE" } }),
    prisma.task.count({ where: { status: "DONE", completedAt: { gte: todayStart } } }),
    prisma.task.count({ where: { status: "LATE" } }),
    prisma.xpLog.aggregate({ _sum: { xpAmount: true } }),
  ]);

  const stats = [
    ["Нийт оюутан", students],
    ["Идэвхтэй (7 хоногт)", activeIds.length],
    ["Түдгэлзүүлсэн", suspended],
    ["Guild", guilds],
    ["Дуусгасан даалгавар", doneTasks],
    ["Өнөөдөр дуусгасан", doneToday],
    ["Хоцорсон (дуусаагүй)", lateTasks],
    ["Олгосон нийт XP", xp._sum.xpAmount ?? 0],
  ] as const;

  return (
    <>
      <PageTitle sub="Системийн ерөнхий үзүүлэлт">Статистик</PageTitle>
      <Flash searchParams={searchParams} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="card">
            <div className="text-2xl font-bold">{value.toLocaleString()}</div>
            <div className="text-sm text-muted">{label}</div>
          </div>
        ))}
      </div>
    </>
  );
}
