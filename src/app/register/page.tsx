import { redirect } from "next/navigation";
import { register } from "@/actions/auth";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import type { SP } from "@/components/ui";

export default async function RegisterPage({ searchParams }: { searchParams: SP }) {
  if (await currentUser()) redirect("/");
  return (
    <AuthForm
      title="Sign up"
      action={register}
      submit="Sign up"
      alt={{ href: "/login", text: "Already have an account?", link: "Log in" }}
      searchParams={searchParams}
    />
  );
}
