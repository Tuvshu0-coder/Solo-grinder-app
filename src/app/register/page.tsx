import { redirect } from "next/navigation";
import { register } from "@/actions/auth";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import type { SP } from "@/components/ui";

export default async function RegisterPage({ searchParams }: { searchParams: SP }) {
  if (await currentUser()) redirect("/");
  return (
    <AuthForm
      title="Бүртгүүлэх"
      action={register}
      submit="Бүртгүүлэх"
      alt={{ href: "/login", text: "Бүртгэлтэй юу?", link: "Нэвтрэх" }}
      searchParams={searchParams}
    />
  );
}
