import { requireAdmin } from "@/lib/auth";
import { Nav } from "@/components/ui";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="shell">
      <Nav
        username={admin.username}
        subtitle="Админ"
        links={[
          { href: "/admin", label: "Статистик" },
          { href: "/admin/users", label: "Хэрэглэгч" },
          { href: "/admin/quests", label: "Quest загвар" },
          { href: "/admin/achievements", label: "Achievement" },
          { href: "/admin/levels", label: "Level" },
        ]}
      />
      <main className="mx-auto w-full max-w-[1240px] min-w-0 px-4 pt-8 pb-16 md:px-8">{children}</main>
    </div>
  );
}
