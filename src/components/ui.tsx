import Link from "next/link";
import { logout } from "@/actions/auth";
import { NavLinks } from "./NavLinks";
import { Icon } from "./pixel";
import { COLORS } from "@/lib/sprites";

export { Bar, RankBadge } from "./pixel";

export type SP = Promise<Record<string, string | string[] | undefined>>;

/** Result message from a form action (?msg= / ?err=), shown in a handheld-style dialog box. */
export async function Flash({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const err = typeof sp.err === "string" ? sp.err : null;
  const msg = typeof sp.msg === "string" ? sp.msg : null;
  if (!err && !msg) return null;
  return (
    <div className={`dialog mb-6 flex items-start gap-3 ${err ? "text-rose" : ""}`} role={err ? "alert" : "status"}>
      <span className="pt-2">
        <Icon name="cursor" scale={3} color={err ? COLORS.rose : undefined} />
      </span>
      <span>{err ?? msg}</span>
    </div>
  );
}

export function Nav({ links, username, subtitle }: { links: { href: string; label: string }[]; username: string; subtitle?: string }) {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href={links[0].href} className="brand">
          <b>SOLO</b> GRINDING
        </Link>
        <NavLinks links={links} />
        <div className="ml-auto flex items-center gap-3 py-1">
          <span className="muted">
            {username}
            {subtitle && <span> · {subtitle}</span>}
          </span>
          <form action={logout}>
            <button className="btn-sec">Гарах</button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-1 flex items-center justify-between gap-4">
      <h2 className="section-title">
        <Icon name="cursor" scale={4} />
        {children}
      </h2>
      {right}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="section-title">
        <Icon name="cursor" scale={4} />
        {children}
      </h1>
      <div className="rule" style={{ marginBottom: sub ? 8 : 18 }} />
      {sub && <p className="muted m-0">{sub}</p>}
    </div>
  );
}
