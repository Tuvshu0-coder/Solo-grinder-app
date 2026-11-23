import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { xpToday } from "@/lib/game";
import { DAILY_XP_CAP } from "@/lib/rules";
import { XP_SOURCES } from "@/lib/labels";
import { addDays, dayKey, dayStart, fmt } from "@/lib/time";
import { Flash, type SP } from "@/components/ui";
import { Bar, Coin, Hero, Icon, RankBadge, Seg } from "@/components/pixel";
import { CompleteButton, TaskSummary } from "@/components/TaskRow";
import { COLORS } from "@/lib/sprites";
import { normalizeAvatar } from "@/lib/avatar";

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
  const toNext = nextLevel ? ceil - user.totalXp : 0;
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

      {/* ---------- player HUD: the one dark block on the page ---------- */}
      <section className="hud mb-10 grid grid-cols-1 items-end gap-x-10 gap-y-5 sm:grid-cols-[auto_minmax(0,1fr)]" aria-label="Player">
        <div className="justify-self-center sm:justify-self-start">
          <Hero avatar={normalizeAvatar(user.avatar)} scale={2} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6">
            <h1 className="m-0 truncate text-3xl font-normal">{user.username}</h1>
            <span className="muted">Player No.{String(user.id).padStart(3, "0")}</span>
          </div>
          <dl className="mt-4 mb-5 grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-5">
            <HudStat label="Level" value={user.levelId} />
            <HudStat label="Rank" value={<RankBadge rank={user.level.rank} />} />
            <HudStat label="Total XP" value={user.totalXp.toLocaleString()} />
            <HudStat label="Streak" value={<span className="flex items-center gap-3"><Icon name="flame" scale={3} />{user.streak} days</span>} />
            <HudStat label="Coins" value={<Link href="/character" className="flex items-center gap-3 text-[var(--white)] no-underline"><Coin scale={2} />{user.coins.toLocaleString()}</Link>} />
          </dl>
          <div className="flex flex-wrap justify-between gap-x-4">
            <span>Level {user.levelId} → {nextLevel ? nextLevel.id : "MAX"}</span>
            <span className="muted">{nextLevel ? `${toNext.toLocaleString()} XP to go` : "Max level"}</span>
          </div>
          <Bar value={user.totalXp - floor} max={ceil - floor} />
        </div>
      </section>

      {/* two independent columns on desktop; below lg the wrappers dissolve (display: contents) so `order` sets one reading order */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="contents lg:flex lg:flex-col lg:gap-8">
          {/* ---------- what is due ---------- */}
          <section className="panel order-1 lg:order-none">
            <div className="panel-head">
              <h2 className="m-0 text-base font-normal">Up next</h2>
              <Link href="/tasks" className="flex shrink-0 items-center gap-2">All <Icon name="cursor" scale={2} color={COLORS.white} /></Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-4 py-2">
                <p className="m-0">Nothing due. Add a task and start earning XP.</p>
                <Link href="/tasks" className="btn">Add a task</Link>
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {upcoming.map((t, i) => (
                  <li key={t.id} className={`grid grid-cols-1 items-center gap-x-5 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] ${i > 0 ? "dash-sep" : ""}`}>
                    <TaskSummary task={t} compact />
                    <CompleteButton id={t.id} returnTo="/" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---------- xp chart ---------- */}
          <section className="panel order-4 lg:order-none">
            <div className="panel-head mint">
              <h2 className="m-0 text-base font-normal">XP, last 14 days</h2>
              <span className="muted">up to {DAILY_XP_CAP} a day</span>
            </div>
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
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-8">
          {/* ---------- today ---------- */}
          <section className="panel order-2 lg:order-none">
            <div className="panel-head">
              <h2 className="m-0 text-base font-normal">Today</h2>
              <span>{today.slice(5)}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4">
              <span>Daily XP</span>
              <span className={nearCap ? "text-butter-dark" : ""}>{todayXp}/{DAILY_XP_CAP}</span>
            </div>
            <Seg value={todayXp} max={DAILY_XP_CAP} blocks={16} tone={nearCap ? "butter" : "violet"} />
            {nearCap && <p className="m-0 text-butter-dark">Almost at the cap. XP past it won&apos;t count.</p>}

            <h3 className="card-title mt-6">Daily quest</h3>
            {quests.length === 0 && <p className="muted m-0">No quests today.</p>}
            <ul className="m-0 grid list-none gap-4 p-0">
              {quests.map((q) => (
                <li key={q.id}>
                  <div className={q.isCompleted ? "muted line-through" : ""}>{q.template.title}</div>
                  <div className="flex items-center gap-3">
                    <Seg value={q.progress} max={q.template.targetValue} />
                    <span className="muted">{Math.min(q.progress, q.template.targetValue)}/{q.template.targetValue}</span>
                    {q.isCompleted && <Icon name="check" scale={2} color={COLORS.violet} />}
                    <span className={`badge ml-auto ${q.isCompleted ? "badge-violet" : "badge-vl"}`}>+{q.template.xpReward} XP</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ---------- finish timing ---------- */}
          <section className="panel order-3 lg:order-none">
            <div className="panel-head mint">
              <h2 className="m-0 text-base font-normal">Finished tasks</h2>
              <span className="muted">{done.length}</span>
            </div>
            <StatRow label="Early (×1.2+)" value={early} cls="badge-violet" />
            <StatRow label="On time" value={onTime} cls="badge-mint" />
            <StatRow label="Late" value={late} cls="badge-rose" />
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

          {/* ---------- recent xp ---------- */}
          <section className="panel order-5 lg:order-none">
            <div className="panel-head mint"><h2 className="m-0 text-base font-normal">XP history</h2></div>
            {recent.length === 0 && <p className="muted m-0">No XP yet.</p>}
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
      </div>
    </>
  );
}

function HudStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="muted">{label}</dt>
      <dd className="m-0 flex min-h-[44px] items-center text-xl">{value}</dd>
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
