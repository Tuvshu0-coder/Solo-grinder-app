import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CONDITION_TYPES } from "@/lib/labels";
import { fmt } from "@/lib/time";
import { PageTitle } from "@/components/ui";
import { Icon, Seg } from "@/components/pixel";
import { COLORS } from "@/lib/sprites";

export default async function AchievementsPage() {
  const user = await requireUser();
  const [all, mine, doneCount, earlyCount] = await Promise.all([
    prisma.achievement.findMany({ orderBy: [{ conditionType: "asc" }, { threshold: "asc" }] }),
    prisma.userAchievement.findMany({ where: { userId: user.id } }),
    prisma.task.count({ where: { subject: { userId: user.id }, status: "DONE" } }),
    prisma.task.count({ where: { subject: { userId: user.id }, status: "DONE", multiplier: { gt: 1 } } }),
  ]);
  const unlocked = new Map(mine.map((m) => [m.achievementId, m.unlockedAt]));
  const current: Record<string, number> = {
    STREAK: user.streak,
    TASKS_DONE: doneCount,
    EARLY_TASKS: earlyCount,
    LEVEL: user.levelId,
  };
  // one ladder per condition, in the label order; conditions without achievements are skipped
  const ladders = Object.entries(CONDITION_TYPES)
    .map(([type, label]) => ({ type, label, tiers: all.filter((a) => a.conditionType === type) }))
    .filter((l) => l.tiers.length > 0);

  return (
    <>
      <PageTitle sub="Achievement бүрийг нэг л удаа авна.">Achievement</PageTitle>

      <div className="hud mb-10 flex flex-wrap items-center gap-x-8 gap-y-3">
        <Icon name="medal" scale={4} />
        <div className="text-3xl">{mine.length}/{all.length}</div>
        <div className="min-w-[200px] flex-1">
          <div className="muted">нээгдсэн</div>
          <Seg value={mine.length} max={all.length} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
        {ladders.map((l) => (
          <section key={l.type} className="panel">
            <div className="panel-head">
              <h2 className="m-0 text-base font-normal">{l.label}</h2>
              <span>Одоо {current[l.type] ?? 0}</span>
            </div>
            <ol className="ladder">
              {l.tiers.map((a, i) => {
                const at = unlocked.get(a.id);
                const value = current[a.conditionType] ?? 0;
                // the trail below a tier lights when the next tier is unlocked too
                const nextOn = l.tiers[i + 1] && unlocked.has(l.tiers[i + 1].id);
                return (
                  <li key={a.id} className={nextOn ? "on" : ""}>
                    <span className={`slot ${at ? "" : "locked"}`}>
                      {at ? <Icon name="medal" scale={3} /> : <Icon name="lock" scale={3} color={COLORS.gray} />}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <h3 className={`m-0 text-base font-normal ${at ? "" : "text-ink-2"}`}>{a.name}</h3>
                        <span className={`badge ${at ? "badge-violet" : "badge-vl"}`}>+{a.xpReward} XP</span>
                      </div>
                      <p className="muted m-0">{a.description}</p>
                      {at ? (
                        <p className="m-0 text-violet-dark">{fmt(at).slice(0, 10)}-нд нээгдсэн</p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-x-3">
                          <Seg value={value} max={a.threshold} blocks={Math.min(a.threshold, 10)} />
                          <span className="muted">{Math.min(value, a.threshold)}/{a.threshold}</span>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
