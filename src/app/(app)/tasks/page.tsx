import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createTask, deleteTask, editDeadline } from "@/actions/student";
import { canEditDeadline, DEADLINE_MAX_MS, DEADLINE_MIN_MS } from "@/lib/rules";
import { TASK_TYPES, multiplierLabel } from "@/lib/labels";
import { DAY, toLocalInput } from "@/lib/time";
import { Flash, PageTitle, type SP } from "@/components/ui";
import { CompleteButton, StatusBadge, TaskSummary } from "@/components/TaskRow";

const FILTERS = { open: "Хийх / Хоцорсон", done: "Дууссан", all: "Бүгд" } as const;

export default async function TasksPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const f = (typeof sp.f === "string" && sp.f in FILTERS ? sp.f : "open") as keyof typeof FILTERS;
  const now = new Date();

  const subjects = await prisma.subject.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } });
  const tasks = await prisma.task.findMany({
    where: {
      subject: { userId: user.id },
      ...(f === "open" ? { status: { in: ["TODO", "LATE"] } } : f === "done" ? { status: "DONE" } : {}),
    },
    orderBy: f === "done" ? { completedAt: "desc" } : { deadline: "asc" },
    include: { subject: true },
  });

  const minDl = toLocalInput(new Date(now.getTime() + DEADLINE_MIN_MS));
  const maxDl = toLocalInput(new Date(now.getTime() + DEADLINE_MAX_MS));
  const defDl = toLocalInput(new Date(now.getTime() + 3 * DAY));

  return (
    <>
      <PageTitle sub="Эрт дуусгах тусам их XP. Даалгавар ≥24 цаг нээлттэй байж байж эрт урамшуулал авна, өдөрт 3 хүртэл.">
        Даалгавар
      </PageTitle>
      <Flash searchParams={searchParams} />

      {subjects.length === 0 ? (
        <div className="card mb-4 text-sm">
          Эхлээд <Link href="/subjects" className="text-accent-2 hover:underline">хичээл нэмнэ үү</Link>.
        </div>
      ) : (
        <form action={createTask} className="card mb-4 grid gap-3 md:grid-cols-[1fr_1fr_2fr_1fr_auto] md:items-end">
          <div>
            <label className="label">Хичээл</label>
            <select name="subjectId" className="input" required>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Төрөл</label>
            <select name="type" className="input" required>
              {Object.entries(TASK_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Нэр</label>
            <input name="title" className="input" placeholder="ж: Лаб 3 — SQL JOIN" required maxLength={120} />
          </div>
          <div>
            <label className="label">Deadline (3 цаг – 30 хоног)</label>
            <input name="deadline" type="datetime-local" className="input" defaultValue={defDl} min={minDl} max={maxDl} required />
          </div>
          <button className="btn h-9">+ Нэмэх</button>
        </form>
      )}

      <div className="mb-3 flex gap-1">
        {Object.entries(FILTERS).map(([k, v]) => (
          <Link
            key={k}
            href={`/tasks?f=${k}`}
            className={`rounded-md px-3 py-1.5 text-sm ${f === k ? "bg-accent text-white" : "text-muted hover:bg-panel-2"}`}
          >
            {v}
          </Link>
        ))}
      </div>

      <div className="card">
        {tasks.length === 0 && <p className="text-sm text-muted">Даалгавар алга.</p>}
        <ul className="divide-y divide-line">
          {tasks.map((t) => {
            const editBlock = canEditDeadline(t, now);
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                <StatusBadge status={t.status} />
                <div className="min-w-0 flex-1">
                  <TaskSummary task={t} />
                  {t.deadlineEdited && t.status !== "DONE" && (
                    <div className="mt-0.5 text-xs text-warn">Deadline өөрчлөгдсөн — хамгийн ихдээ ×1.0</div>
                  )}
                </div>
                {t.status === "DONE" ? (
                  <div className="text-right text-sm">
                    <div className="font-semibold text-good">+{t.xpEarned} XP</div>
                    <div className="text-xs text-muted">{multiplierLabel(t.multiplier)}</div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {!editBlock && (
                      <details className="relative">
                        <summary className="btn-ghost list-none">Deadline</summary>
                        <form action={editDeadline} className="absolute right-0 z-10 mt-2 w-72 space-y-2 rounded-lg border border-line bg-panel-2 p-3 shadow-xl">
                          <input type="hidden" name="id" value={t.id} />
                          <p className="text-xs text-warn">Зөвхөн нэг удаа. Өөрчилсний дараа хамгийн ихдээ ×1.0.</p>
                          <input name="deadline" type="datetime-local" className="input" defaultValue={toLocalInput(t.deadline)} min={minDl} max={maxDl} required />
                          <button className="btn w-full">Хадгалах</button>
                        </form>
                      </details>
                    )}
                    <form action={deleteTask}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="btn-danger">Устгах</button>
                    </form>
                    <CompleteButton id={t.id} returnTo={`/tasks?f=${f}`} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
