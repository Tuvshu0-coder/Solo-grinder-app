import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { saveLevel } from "@/actions/admin";
import { Flash, PageTitle, RankBadge, type SP } from "@/components/ui";

export default async function AdminLevels({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const levels = await prisma.level.findMany({ orderBy: { id: "asc" }, include: { _count: { select: { users: true } } } });
  const nextId = (levels.at(-1)?.id ?? 0) + 1;

  return (
    <>
      <PageTitle sub="Default threshold: 20 × L². After a change, every user's level is recalculated.">Levels and ranks</PageTitle>
      <Flash searchParams={searchParams} />
      <div className="card mb-4">
        <h2 className="card-title">Add level</h2>
        <form action={saveLevel} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={nextId} />
          <div className="text-sm">Level {nextId}</div>
          <input name="minXp" type="number" min={0} defaultValue={20 * nextId * nextId} className="input w-36" required />
          <input name="rank" defaultValue="S" className="input w-16" maxLength={1} required />
          <button className="btn">+ Add</button>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Level</th>
              <th>Rank</th>
              <th>Users</th>
              <th>Threshold XP / Rank</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((l) => (
              <tr key={l.id}>
                <td className="font-medium">{l.id}</td>
                <td><RankBadge rank={l.rank} /></td>
                <td className="text-muted">{l._count.users}</td>
                <td>
                  <form action={saveLevel} className="flex gap-2">
                    <input type="hidden" name="id" value={l.id} />
                    <input name="minXp" type="number" min={0} defaultValue={l.minXp} className="input w-36" required />
                    <input name="rank" defaultValue={l.rank} className="input w-16" maxLength={1} required />
                    <button className="btn-ghost">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
