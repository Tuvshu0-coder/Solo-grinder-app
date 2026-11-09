import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { xpToday } from "@/lib/game";
import { DAILY_XP_CAP } from "@/lib/rules";
import { XP_SOURCES } from "@/lib/labels";
import { addDays, dayKey, dayStart, fmt } from "@/lib/time";
import { Flash, type SP } from "@/components/ui";
import { Bar, Hero, Icon, RankBadge, Seg } from "@/components/pixel";
import { CompleteButton, StatusBadge, TaskSummary } from "@/components/TaskRow";
import { COLORS } from "@/lib/sprites";

const CHART_H = 160; // px, multiple of 4 so bar heights land on whole art pixels

export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const today = dayKey();
  const fromDay = addDays(today, -13);

  const [nextLevel, todayXp, quests, upcoming, done, history, recent] = await Promise.all([
    prisma.level.findUnique({ where: { id: user.levelId + 1 } }),
    xpToday(prisma, user.id),
    prisma.dailyQuest.findMany({ where: { userId: user.id, questDate: today }, include: { template: true }, orderBy: { id: "asc" } }),
    prisma.task.findMany({
      where: { subject: { userId: user.id }, status: { in: ["TODO", "LATE"] } },
      orderBy: { deadline: "asc" },
      take: 5,
      include: { subject: true },
    }),
    prisma.task.findMany({ where: { subject: { userId: user.id }, status: "DONE" }, select: { multiplier: true } }),
    prisma.xpLog.findMany({ where: { userId: user.id, createdAt: { gte: dayStart(fromDay) } } }),
    prisma.xpLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  const floor = user.level.minXp;
  const ceil = nextLevel?.minXp ?? floor;
  const early = done.filter((t) => (t.multiplier ?? 0) > 1).length;
  const onTime = done.filter((t) => t.multiplier === 1).length;
  const late = done.filter((t) => (t.multiplier ?? 1) < 1).length;
  const nearCap = todayXp >= DAILY_XP_CAP * 0.9;

  const days = Array.from({ length: 14 }, (_, i) => addDays(fromDay, i));
  const perDay = new Map(days.map((d) => [d, 0]));
  for (const l of history) {
    const k = dayKey(l.createdAt);
    perDay.set(k, (perDay.get(k) ?? 0) + l.xpAmount);
  }
  const maxDay = Math.max(DAILY_XP_CAP / 2, ...perDay.values());

  return (
    <>
      <Flash searchParams={searchParams} />

      <div className="grid grid-cols-1 gap-x-7 gap-y-8 lg:grid-cols-12">
        {/* ---------- player card ---------- */}
        <section className="panel lg:col-span-5">
          <div className="panel-head mint">
            <span className="flex items-center gap-3"><Icon name="cursor" scale={3} /> Тоглогч</span>
            <span className="muted">No.{String(user.id).padStart(3, "0")}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6">
            <Hero scale={3} />
            <div className="min-w-[200px] flex-1">
              <div className="truncate text-3xl">{user.username}</div>
              <Stat label="Level" value={String(user.levelId)} />
              <Stat label="Rank" value={<RankBadge rank={user.level.rank} />} />
              <Stat label="Streak" value={<span className="flex items-center gap-2"><Icon name="flame" scale={2} /> {user.streak}</span>} />
              <Stat label="Нийт XP" value={user.totalXp.toLocaleString()} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex justify-between gap-3">
              <span>Level {user.levelId} → {nextLevel ? nextLevel.id : "MAX"}</span>
              <span className="muted">{nextLevel ? `${(ceil - user.totalXp).toLocaleString()} XP` : "—"}</span>
            </div>
            <Bar value={user.totalXp - floor} max={ceil - floor} />
          </div>
        </section>

        {/* ---------- today ---------- */}
        <section className="panel lg:col-span-7">
          <div className="panel-head">
            <span>Өнөөдөр</span>
            <span>{today}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4">
            <span>Өдрийн XP</span>
            <span className={nearCap ? "text-butter-dark" : ""}>{todayXp}/{DAILY_XP_CAP}</span>
          </div>
          <Seg value={todayXp} max={DAILY_XP_CAP} blocks={20} tone={nearCap ? "butter" : "violet"} />
          {nearCap && <p className="m-0 text-butter-dark">Өдрийн хязгаарт ойртлоо — үлдсэн XP тасарна.</p>}

          <h3 className="card-title mt-5">Daily quest</h3>
          {quests.length === 0 && <p className="muted m-0">Өнөөдөр quest алга.</p>}
          <ul className="m-0 grid list-none gap-3 p-0">
            {quests.map((q) => (
              <li key={q.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4">
                <span className={q.isCompleted ? "muted line-through" : ""}>{q.template.title}</span>
                <span className={`badge ${q.isCompleted ? "badge-violet" : "badge-vl"}`}>+{q.template.xpReward} XP</span>
                <span className="flex items-center gap-3">
                  <Seg value={q.progress} max={q.template.targetValue} />
                  <span className="muted">{Math.min(q.progress, q.template.targetValue)}/{q.template.targetValue}</span>
                  {q.isCompleted && <Icon name="check" scale={2} color={COLORS.violet} />}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- deadlines ---------- */}
        <section className="panel lg:col-span-8">
          <div className="panel-head">
            <span>Deadline ойртсон</span>
            <Link href="/tasks" className="flex items-center gap-2">Бүгд <Icon name="cursor" scale={2} color={COLORS.white} /></Link>
          </div>
          {upcoming.length === 0 && (
            <p className="m-0">
              Хийх даалгавар алга. <Link href="/tasks" className="text-violet-dark">Даалгавар нэмэх</Link>
            </p>
          )}
          <ul className="m-0 list-none p-0">
            {upcoming.map((t, i) => (
              <li key={t.id} className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] ${i > 0 ? "dash-sep" : ""}`}>
                <StatusBadge status={t.status} />
                <TaskSummary task={t} compact />
                <div className="col-span-2 sm:col-span-1">
                  <CompleteButton id={t.id} returnTo="/" />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- stats ---------- */}
        <section className="panel lg:col-span-4">
          <div className="panel-head mint"><span>Статистик</span><span className="muted">{done.length}</span></div>
          <StatRow label="Эрт (×1.2+)" value={early} cls="badge-violet" />
          <StatRow label="Хугацаандаа" value={onTime} cls="badge-mint" />
          <StatRow label="Хоцорсон" value={late} cls="badge-rose" />
          <div className="track mt-4 flex" aria-hidden>
            {done.length > 0 && (
              <>
                <span className="block h-full" style={{ width: `${(early / done.length) * 100}%`, background: "var(--violet)" }} />
                <span className="block h-full" style={{ width: `${(onTime / done.length) * 100}%`, background: "var(--mint-dark)" }} />
                <span className="block h-full" style={{ width: `${(late / done.length) * 100}%`, background: "var(--rose)" }} />
              </>
            )}
          </div>
        </section>

        {/* ---------- xp chart ---------- */}
        <section className="panel lg:col-span-8">
          <div className="panel-head"><span>Сүүлийн 14 хоногийн XP</span><span>max {DAILY_XP_CAP}</span></div>
          <div className="flex items-end gap-[6px]" style={{ height: CHART_H }}>
            {days.map((d) => {
              const v = perDay.get(d) ?? 0;
              const h = Math.round(((v / maxDay) * CHART_H) / 4) * 4;
              return (
                <div key={d} className="flex h-full flex-1 items-end" title={`${d}: ${v} XP`}>
                  <span
                    className="block w-full"
                    style={{ height: h, background: d === today ? "var(--butter)" : "var(--violet)", boxShadow: h ? "inset 0 0 0 2px var(--ink)" : undefined }}
                  />
                </div>
              );
            })}
          </div>
          <div className="dash-days mt-1 flex gap-[6px]">
            {days.map((d) => (
              <span key={d} className="muted min-w-0 flex-1 text-center">{d.slice(8)}</span>
            ))}
          </div>
        </section>

        {/* ---------- recent xp ---------- */}
        <section className="panel lg:col-span-4">
          <div className="panel-head mint"><span>XP-ийн түүх</span></div>
          {recent.length === 0 && <p className="muted m-0">Одоогоор XP алга.</p>}
          <ul className="m-0 grid list-none gap-1 p-0">
            {recent.map((l) => (
              <li key={l.id} className="flex items-baseline gap-3">
                <span className="min-w-0 flex-1 truncate">{XP_SOURCES[l.source] ?? l.source}</span>
                <span className="muted whitespace-nowrap">{fmt(l.createdAt).slice(5, 10)}</span>
                <span className={`w-[4ch] text-right ${l.xpAmount > 0 ? "text-violet-dark" : "muted"}`}>+{l.xpAmount}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function StatRow({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span>{label}</span>
      <span className={`badge ${cls}`}>{value}</span>
    </div>
  );
}
