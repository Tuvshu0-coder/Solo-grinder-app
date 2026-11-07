import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Nav } from "@/components/ui";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/admin");
  return (
    <>
      <Nav
        username={user.username}
        subtitle={`Lv.${user.levelId} · ${user.level.rank}`}
        links={[
          { href: "/", label: "Dashboard" },
          { href: "/tasks", label: "Даалгавар" },
          { href: "/subjects", label: "Хичээл" },
          { href: "/achievements", label: "Achievement" },
          { href: "/guild", label: "Guild" },
        ]}
      />
      <main className="mx-auto max-w-[1240px] px-4 pt-8 pb-16">{children}</main>
    </>
  );
}
