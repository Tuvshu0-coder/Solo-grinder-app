"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./pixel";
import { COLORS } from "@/lib/sprites";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  const root = links[0]?.href;
  return (
    <nav className="side-nav">
      {links.map((l) => {
        const on = l.href === root ? path === l.href : path === l.href || path.startsWith(`${l.href}/`);
        return (
          <Link key={l.href} href={l.href} className={`tab ${on ? "on" : ""}`} aria-current={on ? "page" : undefined}>
            {/* menu cursor: only drawn on the current page, the slot keeps labels aligned */}
            <Icon name="cursor" scale={3} color={COLORS.white} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
