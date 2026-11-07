import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { xpToday } from "@/lib/game";
import { DAILY_XP_CAP } from "@/lib/rules";
import { XP_SOURCES } from "@/lib/labels";
import { addDays, dayKey, dayStart, fmt } from "@/lib/time";
import { Bar, Flash, RankBadge, type SP } from "@/components/ui";
import { CompleteButton, StatusBadge, TaskSummary } from "@/components/TaskRow";

export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const today = dayKey();
  const fromDay = addDays(today, -13);

  const [nextLevel, todayXp, quests, upcoming, done, history, recent] = await Promise.all([
    prisma.level.findUnique({ where: { id: user.levelId + 1 } }),
    xpToday(prisma, user.id),
    prisma.dailyQuest.findMany({ where: { userId: user.id, questDate: today }, include: { template: true } }),
    prisma.task.findMany({
      where: { subject: { userId: user.id }, status: { in: ["TODO", "LATE"] } },
      orderBy: { deadline: "asc" },
      take: 6,
      include: { subject: true },
    }),
    prisma.task.findMany({ where: { subject: { userId: user.id }, status: "DONE" }, select: { multiplier: true } }),
    prisma.xpLog.findMany({ where: { userId: user.id, createdAt: { gte: dayStart(fromDay) } } }),
    prisma.xpLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const levelFloor = user.level.minXp;
  const levelCeil = nextLevel?.minXp ?? levelFloor;
  const early = done.filter((t) => (t.multiplier ?? 0) > 1).length;
  const onTime = done.filter((t) => t.multiplier === 1).length;
  const late = done.filter((t) => (t.multiplier ?? 1) < 1).length;

  const days = Array.from({ length: 14 }, (_, i) => addDays(fromDay, i));
  const perDay = new Map(days.map((d) => [d, 0]));
  for (const l of history) {
    const k = dayKey(l.createdAt);
    perDay.set(k, (perDay.get(k) ?? 0) + l.xpAmount);
  }
  const maxDay = Math.max(DAILY_XP_CAP / 4, ...perDay.values());

  return (
    <>
      <Flash searchParams={searchParams} />

      <div className="grid gap-4 md:grid-cols-3">
        {/* Level card */}
        <section className="card md:col-span-2">
          <div className="flex items-center gap-4">
            <RankBadge rank={user.level.rank} big />
            <div className="flex-1">
              <div className="flex items-baseline justify-between">
                <div className="text-xl font-bold">Level {user.levelId}</div>
                <div className="text-sm text-muted">Нийт {user.totalXp.toLocaleString()} XP</div>
              </div>
              <div className="mt-2">
                <Bar value={user.totalXp - levelFloor} max={levelCeil - levelFloor} />
              </div>
              <div className="mt-1 text-xs text-muted">
                {nextLevel
                  ? `Level ${nextLevel.id} хүртэл ${(levelCeil - user.totalXp).toLocaleString()} XP`
                  : "Хамгийн дээд level!"}
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <Stat label="Streak" value={`🔥 ${user.streak}`} />
            <Stat label="Өнөөдрийн XP" value={`${todayXp}/${DAILY_XP_CAP}`} warn={todayXp >= DAILY_XP_CAP} />
            <Stat label="Дуусгасан" value={String(done.length)} />
          </div>
          <div className="mt-3">
            <Bar value={todayXp} max={DAILY_XP_CAP} color={todayXp >= DAILY_XP_CAP ? "bg-warn" : "bg-accent-2"} />
          </div>
        </section>

        {/* Daily quests */}
        <section className="card">
          <h2 className="card-title">Өнөөдрийн quest</h2>
          {quests.length === 0 && <p className="text-sm text-muted">Өнөөдөр quest алга.</p>}
          <ul className="space-y-3">
            {quests.map((q) => (
              <li key={q.id}>
                <div className="flex items-start justify-between gap-2 text-sm">
                  <span className={q.isCompleted ? "text-muted line-through" : ""}>{q.template.title}</span>
                  <span className="shrink-0 text-xs text-accent-2">+{q.template.xpReward} XP</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Bar value={q.progress} max={q.template.targetValue} color={q.isCompleted ? "bg-good" : "bg-accent"} />
                  <span className="text-xs text-muted">
                    {Math.min(q.progress, q.template.targetValue)}/{q.template.targetValue}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">Quest өдөр бүр 00:00-д шинэчлэгдэнэ.</p>
        </section>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {/* Upcoming */}
        <section className="card md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="card-title mb-0">Deadline ойртсон</h2>
            <Link href="/tasks" className="text-sm text-accent-2 hover:underline">Бүгд →</Link>
          </div>
          {upcoming.length === 0 && (
            <p className="text-sm text-muted">
              Хийх даалгавар алга. <Link href="/tasks" className="text-accent-2 hover:underline">Даалгавар нэмэх</Link>
            </p>
          )}
          <ul className="divide-y divide-line">
            {upcoming.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <StatusBadge status={t.status} />
                <div className="min-w-0 flex-1">
                  <TaskSummary task={t} />
                </div>
                <CompleteButton id={t.id} returnTo="/" />
              </li>
            ))}
          </ul>
        </section>

        {/* Stats */}
        <section className="card">
          <h2 className="card-title">Статистик</h2>
          <div className="space-y-2 text-sm">
            <Row label="Эрт дуусгасан (×1.2+)" value={early} tone="text-good" />
            <Row label="Хугацаандаа (×1.0)" value={onTime} tone="text-accent-2" />
            <Row label="Хоцорч дуусгасан" value={late} tone="text-bad" />
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-panel-2">
            {done.length > 0 && (
              <>
                <div className="bg-good" style={{ width: `${(early / done.length) * 100}%` }} />
                <div className="bg-accent-2" style={{ width: `${(onTime / done.length) * 100}%` }} />
                <div className="bg-bad" style={{ width: `${(late / done.length) * 100}%` }} />
              </>
            )}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {/* XP chart */}
        <section className="card md:col-span-2">
          <h2 className="card-title">Сүүлийн 14 хоногийн XP</h2>
          <div className="flex h-40 items-end gap-1.5">
            {days.map((d) => {
              const v = perDay.get(d) ?? 0;
              return (
                <div key={d} className="group flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-[10px] text-muted opacity-0 group-hover:opacity-100">{v}</span>
                  <div
                    className={`w-full rounded-t ${d === today ? "bg-accent" : "bg-accent/50"}`}
                    style={{ height: `${(v / maxDay) * 100}%`, minHeight: v > 0 ? 2 : 0 }}
                    title={`${d}: ${v} XP`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1.5">
            {days.map((d) => (
              <div key={d} className="flex-1 text-center text-[10px] text-muted">{d.slice(8)}</div>
            ))}
          </div>
        </section>

        {/* Recent XP */}
        <section className="card">
          <h2 className="card-title">XP-ийн түүх</h2>
          {recent.length === 0 && <p className="text-sm text-muted">Одоогоор XP алга.</p>}
          <ul className="space-y-2 text-sm">
            {recent.map((l) => (
              <li key={l.id} className="flex justify-between gap-2">
                <span>
                  {XP_SOURCES[l.source] ?? l.source}
                  <span className="ml-2 text-xs text-muted">{fmt(l.createdAt)}</span>
                </span>
                <span className={l.xpAmount > 0 ? "text-good" : "text-muted"}>+{l.xpAmount}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-panel-2 px-2 py-3">
      <div className={`text-lg font-bold ${warn ? "text-warn" : ""}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  );
}
