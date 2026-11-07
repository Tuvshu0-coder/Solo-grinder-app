import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CONDITION_TYPES } from "@/lib/labels";
import { fmt } from "@/lib/time";
import { Bar, PageTitle } from "@/components/ui";

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

  return (
    <>
      <PageTitle sub={`${mine.length}/${all.length} нээгдсэн. Achievement бүрийг зөвхөн нэг удаа авна.`}>Achievement</PageTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {all.map((a) => {
          const at = unlocked.get(a.id);
          const value = current[a.conditionType] ?? 0;
          return (
            <div key={a.id} className={`card ${at ? "border-good/40" : "opacity-80"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{at ? "🏆 " : "🔒 "}{a.name}</div>
                  <div className="text-sm text-muted">{a.description}</div>
                </div>
                <span className="badge bg-accent/15 text-accent">+{a.xpReward} XP</span>
              </div>
              <div className="mt-3">
                {at ? (
                  <div className="text-xs text-good">Нээгдсэн: {fmt(at)}</div>
                ) : (
                  <>
                    <Bar value={value} max={a.threshold} />
                    <div className="mt-1 text-xs text-muted">
                      {CONDITION_TYPES[a.conditionType as keyof typeof CONDITION_TYPES]}: {Math.min(value, a.threshold)}/{a.threshold}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
