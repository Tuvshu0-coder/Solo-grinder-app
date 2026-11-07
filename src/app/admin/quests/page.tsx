import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { saveTemplate, toggleTemplate } from "@/actions/admin";
import { GOAL_TYPES, TASK_TYPES } from "@/lib/labels";
import { Flash, PageTitle, type SP } from "@/components/ui";

type T = { id?: number; title?: string; goalType?: string; taskType?: string | null; targetValue?: number; xpReward?: number };

function TemplateForm({ t }: { t: T }) {
  return (
    <form action={saveTemplate} className="grid gap-2 md:grid-cols-[2fr_1.3fr_1.3fr_0.6fr_0.6fr_auto] md:items-end">
      <input type="hidden" name="id" value={t.id ?? ""} />
      <div>
        <label className="label">Гарчиг</label>
        <input name="title" defaultValue={t.title} className="input" required />
      </div>
      <div>
        <label className="label">Зорилтын төрөл</label>
        <select name="goalType" defaultValue={t.goalType ?? "COMPLETE_N"} className="input">
          {Object.entries(GOAL_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Даалгаврын төрөл</label>
        <select name="taskType" defaultValue={t.taskType ?? ""} className="input">
          <option value="">—</option>
          {Object.entries(TASK_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Зорилт</label>
        <input name="targetValue" type="number" min={1} defaultValue={t.targetValue ?? 1} className="input" required />
      </div>
      <div>
        <label className="label">XP</label>
        <input name="xpReward" type="number" min={0} defaultValue={t.xpReward ?? 20} className="input" required />
      </div>
      <button className="btn h-9">{t.id ? "Хадгалах" : "+ Нэмэх"}</button>
    </form>
  );
}

export default async function AdminQuests({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const templates = await prisma.questTemplate.findMany({ orderBy: [{ goalType: "asc" }, { id: "asc" }] });
  return (
    <>
      <PageTitle sub="Өдөр бүр хэрэглэгчид идэвхтэй загваруудаас 3 өөр төрлийн quest оноогдоно.">Daily quest загвар</PageTitle>
      <Flash searchParams={searchParams} />
      <div className="card mb-4">
        <h2 className="card-title">Шинэ загвар</h2>
        <TemplateForm t={{}} />
      </div>
      <div className="space-y-3">
        {templates.map((t) => (
          <div key={t.id} className={`card ${t.isActive ? "" : "opacity-60"}`}>
            <div className="mb-2 flex items-center justify-between">
              <span className={`badge ${t.isActive ? "bg-good/15 text-good" : "bg-bad/15 text-bad"}`}>
                {t.isActive ? "Идэвхтэй" : "Идэвхгүй"}
              </span>
              <form action={toggleTemplate}>
                <input type="hidden" name="id" value={t.id} />
                <button className="btn-ghost text-xs">{t.isActive ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}</button>
              </form>
            </div>
            <TemplateForm t={t} />
          </div>
        ))}
      </div>
    </>
  );
}
