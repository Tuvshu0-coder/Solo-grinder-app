import { requireAdmin } from "@/lib/auth";
import { Nav } from "@/components/ui";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <>
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
      <main className="mx-auto max-w-[1240px] px-4 pt-8 pb-16">{children}</main>
    </>
  );
}
