import Link from "next/link";
import { logout } from "@/actions/auth";

export type SP = Promise<Record<string, string | string[] | undefined>>;

export async function Flash({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const err = typeof sp.err === "string" ? sp.err : null;
  const msg = typeof sp.msg === "string" ? sp.msg : null;
  if (!err && !msg) return null;
  return (
    <div
      className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
        err ? "border-bad/40 bg-bad/10 text-bad" : "border-good/40 bg-good/10 text-good"
      }`}
    >
      {err ?? msg}
    </div>
  );
}

export function Bar({ value, max, color = "bg-accent" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-panel-2">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const RANK_COLORS: Record<string, string> = {
  E: "bg-slate-600 text-white",
  D: "bg-emerald-600 text-white",
  C: "bg-sky-600 text-white",
  B: "bg-violet-600 text-white",
  A: "bg-amber-500 text-black",
  S: "bg-gradient-to-r from-rose-500 to-amber-400 text-black",
};

export function RankBadge({ rank, big }: { rank: string; big?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg font-black ${RANK_COLORS[rank] ?? ""} ${
        big ? "h-14 w-14 text-3xl" : "h-6 w-6 text-xs"
      }`}
    >
      {rank}
    </span>
  );
}

export function Nav({ links, username, subtitle }: { links: { href: string; label: string }[]; username: string; subtitle?: string }) {
  return (
    <header className="border-b border-line bg-panel/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href={links[0].href} className="text-lg font-black tracking-tight">
          <span className="text-accent">SOLO</span> GRINDING
        </Link>
        <nav className="flex flex-wrap gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 text-sm text-muted hover:bg-panel-2 hover:text-text">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-muted">
            {username}
            {subtitle && <span className="ml-2 text-xs">{subtitle}</span>}
          </span>
          <form action={logout}>
            <button className="btn-ghost">Гарах</button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold">{children}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}
