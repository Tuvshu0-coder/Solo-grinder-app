import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { addSubject, deleteSubject, renameSubject } from "@/actions/student";
import { Flash, PageTitle, type SP } from "@/components/ui";

export default async function SubjectsPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const subjects = await prisma.subject.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: { tasks: { select: { status: true } } },
  });

  return (
    <>
      <PageTitle sub="Даалгавар бүр заавал нэг хичээлд харьяалагдана.">Хичээл</PageTitle>
      <Flash searchParams={searchParams} />

      <form action={addSubject} className="card mb-4 flex gap-2">
        <input name="name" className="input" placeholder="Хичээлийн нэр (ж: Өгөгдлийн сан)" required maxLength={60} />
        <button className="btn shrink-0">+ Нэмэх</button>
      </form>

      <div className="card">
        {subjects.length === 0 ? (
          <p className="text-sm text-muted">Хичээл алга. Дээрээс нэмнэ үү.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Нэр</th>
                <th>Хийх</th>
                <th>Дууссан</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td>
                    <form action={renameSubject} className="flex gap-2">
                      <input type="hidden" name="id" value={s.id} />
                      <input name="name" defaultValue={s.name} className="input max-w-xs" required maxLength={60} />
                      <button className="btn-ghost">Хадгалах</button>
                    </form>
                  </td>
                  <td>{s.tasks.filter((t) => t.status !== "DONE").length}</td>
                  <td>{s.tasks.filter((t) => t.status === "DONE").length}</td>
                  <td className="text-right">
                    <form action={deleteSubject}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="btn-danger" title="Хичээл болон бүх даалгаврыг устгана">Устгах</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
