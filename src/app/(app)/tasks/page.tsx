import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createTask, deleteTask, editDeadline } from "@/actions/student";
import { canEditDeadline, DEADLINE_MAX_MS, DEADLINE_MIN_MS } from "@/lib/rules";
import { TASK_TYPES, multiplierLabel } from "@/lib/labels";
import { DAY, toLocalInput } from "@/lib/time";
import { Dialog, Flash, PageTitle, type SP } from "@/components/ui";
import { CompleteButton, TaskSummary } from "@/components/TaskRow";

const FILTERS = { open: "Хийх", done: "Дууссан", all: "Бүгд" } as const;

// urgency groups, in reading order; a task lands in the first one that matches
const GROUPS = [
  { key: "late", title: "Хоцорсон", head: "rose" },
  { key: "soon", title: "24 цагийн дотор", head: "" },
  { key: "later", title: "Дараа нь", head: "mint" },
  { key: "done", title: "Дууссан", head: "mint" },
] as const;

export default async function TasksPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const f = (typeof sp.f === "string" && sp.f in FILTERS ? sp.f : "open") as keyof typeof FILTERS;
  const now = new Date();
  const mine = { subject: { userId: user.id } };

  const [subjects, tasks, counts] = await Promise.all([
    prisma.subject.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.task.findMany({
      where: { ...mine, ...(f === "open" ? { status: { in: ["TODO", "LATE"] } } : f === "done" ? { status: "DONE" } : {}) },
      orderBy: f === "done" ? { completedAt: "desc" } : { deadline: "asc" },
      include: { subject: true },
    }),
    prisma.task.groupBy({ by: ["status"], where: mine, _count: { _all: true } }),
  ]);

  const n = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const tabCount = { open: n("TODO") + n("LATE"), done: n("DONE"), all: n("TODO") + n("LATE") + n("DONE") };
  const groupOf = (t: (typeof tasks)[number]) => {
    if (t.status === "DONE") return "done";
    const left = t.deadline.getTime() - now.getTime();
    return t.status === "LATE" || left < 0 ? "late" : left < DAY ? "soon" : "later";
  };

  const minDl = toLocalInput(new Date(now.getTime() + DEADLINE_MIN_MS));
  const maxDl = toLocalInput(new Date(now.getTime() + DEADLINE_MAX_MS));
  const defDl = toLocalInput(new Date(now.getTime() + 3 * DAY));
  const returnTo = `/tasks?f=${f}`;

  return (
    <>
      <PageTitle sub="Эрт дуусгах тусам их XP. 24 цагаас дээш нээлттэй байсан даалгавар эрт урамшуулал авна, өдөрт 3 хүртэл.">
        Даалгавар
      </PageTitle>
      <Flash searchParams={searchParams} />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0" aria-label="Даалгаврын жагсаалт">
          <nav className="mb-6 flex flex-wrap gap-3" aria-label="Шүүлтүүр">
            {Object.entries(FILTERS).map(([k, v]) => (
              <Link key={k} href={`/tasks?f=${k}`} className={f === k ? "btn" : "btn-sec"} aria-current={f === k ? "page" : undefined}>
                {v} <span className={f === k ? "" : "muted"}>{tabCount[k as keyof typeof tabCount]}</span>
              </Link>
            ))}
          </nav>

          {tasks.length === 0 && (
            <div className="panel">
              <p className="m-0">
                {f === "done" ? "Дууссан даалгавар алга. Эхнийхээ дуусгаад XP аваарай." : "Хийх даалгавар алга. Баруун талаас шинээр нэмнэ үү."}
              </p>
            </div>
          )}

          <div className="grid gap-8">
            {GROUPS.map((g) => {
              const list = tasks.filter((t) => groupOf(t) === g.key);
              if (list.length === 0) return null;
              return (
                <section key={g.key} className="panel @container">
                  <div className={`panel-head ${g.head}`}>
                    <h2 className="m-0 text-base font-normal">{g.title}</h2>
                    <span>{list.length}</span>
                  </div>
                  <ul className="m-0 list-none p-0">
                    {list.map((t, i) => (
                      // container query: text and buttons share a line only when the panel itself is wide enough
                      <li key={t.id} className={`grid grid-cols-1 items-center gap-x-5 gap-y-3 py-3 @xl:grid-cols-[minmax(0,1fr)_auto] ${i > 0 ? "dash-sep" : ""}`}>
                        <div className="min-w-0">
                          <TaskSummary task={t} />
                          {t.deadlineEdited && t.status !== "DONE" && (
                            <div className="text-butter-dark">Deadline өөрчлөгдсөн тул хамгийн ихдээ ×1.0</div>
                          )}
                        </div>
                        {t.status === "DONE" ? (
                          <div className="@xl:text-right">
                            <div className="text-violet-dark">+{t.xpEarned} XP</div>
                            <div className="muted">{multiplierLabel(t.multiplier)}</div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            <Dialog id={`task-${t.id}`} label="Засах" title={t.title}>
                              {canEditDeadline(t, now) ? (
                                <p className="muted m-0">{canEditDeadline(t, now)}</p>
                              ) : (
                                <form action={editDeadline} className="grid gap-2">
                                  <input type="hidden" name="id" value={t.id} />
                                  <label className="label" htmlFor={`dl-${t.id}`}>Шинэ deadline</label>
                                  <input id={`dl-${t.id}`} name="deadline" type="datetime-local" className="input" defaultValue={toLocalInput(t.deadline)} min={minDl} max={maxDl} required />
                                  <p className="m-0 text-butter-dark">Зөвхөн нэг удаа солино. Солисны дараа хамгийн ихдээ ×1.0.</p>
                                  <button className="btn justify-self-start">Deadline хадгалах</button>
                                </form>
                              )}
                              <form action={deleteTask} className="dash-sep grid gap-2 pt-4">
                                <input type="hidden" name="id" value={t.id} />
                                <p className="m-0">Устгасан даалгавар буцаж сэргэхгүй.</p>
                                <button className="btn-danger justify-self-start">Даалгавар устгах</button>
                              </form>
                            </Dialog>
                            <CompleteButton id={t.id} returnTo={returnTo} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </section>

        <aside className="panel lg:sticky lg:top-8" aria-label="Шинэ даалгавар">
          <div className="panel-head">
            <h2 className="m-0 text-base font-normal">Шинэ даалгавар</h2>
          </div>
          {subjects.length === 0 ? (
            <div className="grid gap-3">
              <p className="m-0">Даалгавар нэг хичээлд харьяалагдана. Эхлээд хичээлээ нэмнэ үү.</p>
              <Link href="/subjects" className="btn justify-self-start">Хичээл нэмэх</Link>
            </div>
          ) : (
            <form action={createTask} className="grid gap-4">
              <div>
                <label className="label" htmlFor="t-subject">Хичээл</label>
                <select id="t-subject" name="subjectId" className="input" required>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="t-type">Төрөл</label>
                <select id="t-type" name="type" className="input" required>
                  {Object.entries(TASK_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="t-title">Нэр</label>
                <input id="t-title" name="title" className="input" placeholder="ж: Лаб 3, SQL JOIN" required maxLength={120} />
              </div>
              <div>
                <label className="label" htmlFor="t-deadline">Deadline</label>
                <input id="t-deadline" name="deadline" type="datetime-local" className="input" defaultValue={defDl} min={minDl} max={maxDl} required />
                <p className="muted m-0 mt-1">3 цагаас 30 хоногийн хооронд</p>
              </div>
              <button className="btn">Даалгавар нэмэх</button>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}
