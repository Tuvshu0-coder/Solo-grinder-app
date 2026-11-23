import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Nav } from "@/components/ui";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/admin");
  return (
    <div className="shell">
      <Nav
        username={user.username}
        subtitle={`Lv.${user.levelId} · ${user.level.rank}`}
        links={[
          { href: "/", label: "Dashboard" },
          { href: "/tasks", label: "Tasks" },
          { href: "/pomodoro", label: "Pomodoro" },
          { href: "/subjects", label: "Subjects" },
          { href: "/achievements", label: "Achievement" },
          { href: "/guild", label: "Guild" },
        ]}
      />
      <main className="mx-auto w-full max-w-[1240px] min-w-0 px-4 pt-8 pb-16 md:px-8">{children}</main>
    </div>
  );
}
