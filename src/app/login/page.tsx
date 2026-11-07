import { redirect } from "next/navigation";
import { login } from "@/actions/auth";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import type { SP } from "@/components/ui";

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  const user = await currentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/");
  return (
    <AuthForm
      title="Нэвтрэх"
      action={login}
      submit="Нэвтрэх"
      alt={{ href: "/register", text: "Бүртгэлгүй юу?", link: "Бүртгүүлэх" }}
      searchParams={searchParams}
    />
  );
}
