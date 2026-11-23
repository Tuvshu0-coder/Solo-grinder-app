import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { addSubject, deleteSubject, renameSubject } from "@/actions/student";
import { Dialog, Flash, PageTitle, type SP } from "@/components/ui";
import { Seg } from "@/components/pixel";

const MAX_PELLETS = 12; // one pellet per task up to this, then pellets scale

export default async function SubjectsPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const subjects = await prisma.subject.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: { tasks: { select: { status: true } } },
  });

  return (
    <>
      <PageTitle sub="Every task belongs to one subject.">Subjects</PageTitle>
      <Flash searchParams={searchParams} />

      <form action={addSubject} className="panel mb-10 flex flex-wrap items-end gap-4">
        <div className="min-w-[240px] flex-1">
          <label className="label" htmlFor="s-name">New subject</label>
          <input id="s-name" name="name" className="input" placeholder="e.g. Databases" required maxLength={60} />
        </div>
        <button className="btn">Add subject</button>
      </form>

      {subjects.length === 0 ? (
        <div className="panel">
          <p className="m-0">No subjects yet. Type your first one above and add it.</p>
        </div>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-8 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((s) => {
            const total = s.tasks.length;
            const done = s.tasks.filter((t) => t.status === "DONE").length;
            const late = s.tasks.filter((t) => t.status === "LATE").length;
            const open = total - done;
            return (
              <li key={s.id} className="panel flex flex-col gap-3">
                <h2 className="m-0 text-xl font-normal break-words">{s.name}</h2>
                {total === 0 ? (
                  <p className="muted m-0">No tasks yet</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-4">
                    <Seg value={done} max={total} blocks={Math.min(total, MAX_PELLETS)} />
                    <span className="muted">{done}/{total} done</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-x-6">
                  <span>{open} to do</span>
                  {late > 0 && <span className="text-rose-dark">{late} late</span>}
                </div>
                <div className="mt-auto pt-2">
                  <Dialog id={`subject-${s.id}`} label="Edit" title={s.name}>
                    <form action={renameSubject} className="grid gap-2">
                      <input type="hidden" name="id" value={s.id} />
                      <label className="label" htmlFor={`sn-${s.id}`}>Name</label>
                      <input id={`sn-${s.id}`} name="name" defaultValue={s.name} className="input" required maxLength={60} />
                      <button className="btn justify-self-start">Save name</button>
                    </form>
                    <form action={deleteSubject} className="dash-sep grid gap-2 pt-4">
                      <input type="hidden" name="id" value={s.id} />
                      <p className="m-0">
                        {total > 0 ? `This deletes the subject and all ${total} of its tasks.` : "This deletes the subject."} It can&apos;t be restored.
                      </p>
                      <button className="btn-danger justify-self-start">Delete subject</button>
                    </form>
                  </Dialog>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
