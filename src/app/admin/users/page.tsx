import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { setSuspended } from "@/actions/admin";
import { fmt } from "@/lib/time";
import { Flash, PageTitle, RankBadge, type SP } from "@/components/ui";

export default async function AdminUsers({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const users = await prisma.user.findMany({
    where: { role: "STUDENT", ...(q ? { username: { contains: q } } : {}) },
    orderBy: { totalXp: "desc" },
    include: { level: true, guildMember: { include: { guild: true } } },
    take: 200,
  });

  return (
    <>
      <PageTitle sub="Suspended users can't log in. Their XP is kept and they're hidden from leaderboards.">Users</PageTitle>
      <Flash searchParams={searchParams} />
      <form className="mb-4 flex max-w-sm gap-2">
        <input name="q" defaultValue={q} className="input" placeholder="Search by username" />
        <button className="btn-ghost">Search</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Level</th>
              <th>XP</th>
              <th>Streak</th>
              <th>Guild</th>
              <th>Joined</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.username}</td>
                <td>
                  <span className="inline-flex items-center gap-2">
                    <RankBadge rank={u.level.rank} /> {u.levelId}
                  </span>
                </td>
                <td>{u.totalXp.toLocaleString()}</td>
                <td>{u.streak}</td>
                <td>{u.guildMember?.guild.name ?? "—"}</td>
                <td className="text-muted">{fmt(u.createdAt)}</td>
                <td>
                  {u.isSuspended ? (
                    <span className="badge bg-bad/15 text-bad">Suspended</span>
                  ) : (
                    <span className="badge bg-good/15 text-good">Active</span>
                  )}
                </td>
                <td className="text-right">
                  <form action={setSuspended}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="suspend" value={u.isSuspended ? "0" : "1"} />
                    <button className={u.isSuspended ? "btn-ghost" : "btn-danger"}>
                      {u.isSuspended ? "Restore" : "Suspend"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="text-sm text-muted">No users found.</p>}
      </div>
    </>
  );
}
