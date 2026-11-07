import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { saveAchievement } from "@/actions/admin";
import { CONDITION_TYPES } from "@/lib/labels";
import { Flash, PageTitle, type SP } from "@/components/ui";

type A = { id?: number; name?: string; description?: string; conditionType?: string; threshold?: number; xpReward?: number };

function AchievementForm({ a, unlocked }: { a: A; unlocked?: number }) {
  return (
    <form action={saveAchievement} className="grid gap-2 md:grid-cols-[1.2fr_2fr_1.3fr_0.6fr_0.6fr_auto] md:items-end">
      <input type="hidden" name="id" value={a.id ?? ""} />
      <div>
        <label className="label">Нэр</label>
        <input name="name" defaultValue={a.name} className="input" required />
      </div>
      <div>
        <label className="label">Тайлбар {unlocked != null && <span>· {unlocked} хэрэглэгч авсан</span>}</label>
        <input name="description" defaultValue={a.description} className="input" />
      </div>
      <div>
        <label className="label">Нөхцөл</label>
        <select name="conditionType" defaultValue={a.conditionType ?? "STREAK"} className="input">
          {Object.entries(CONDITION_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Босго</label>
        <input name="threshold" type="number" min={1} defaultValue={a.threshold ?? 1} className="input" required />
      </div>
      <div>
        <label className="label">XP</label>
        <input name="xpReward" type="number" min={0} defaultValue={a.xpReward ?? 50} className="input" required />
      </div>
      <button className="btn h-9">{a.id ? "Хадгалах" : "+ Нэмэх"}</button>
    </form>
  );
}

export default async function AdminAchievements({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const list = await prisma.achievement.findMany({
    orderBy: [{ conditionType: "asc" }, { threshold: "asc" }],
    include: { _count: { select: { users: true } } },
  });
  return (
    <>
      <PageTitle sub="Achievement-ийн XP өдрийн 400 XP-ийн хязгаарт багтана.">Achievement</PageTitle>
      <Flash searchParams={searchParams} />
      <div className="card mb-4">
        <h2 className="card-title">Шинэ achievement</h2>
        <AchievementForm a={{}} />
      </div>
      <div className="space-y-3">
        {list.map((a) => (
          <div key={a.id} className="card">
            <AchievementForm a={a} unlocked={a._count.users} />
          </div>
        ))}
      </div>
    </>
  );
}
