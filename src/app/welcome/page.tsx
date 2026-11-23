import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DEFAULT_AVATAR } from "@/lib/avatar";
import CharacterEditor from "@/components/CharacterEditor";
import { Icon } from "@/components/pixel";

// First screen after sign-up (or the first login of a player without a character).
export default async function WelcomePage() {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/admin");
  if (user.avatar) redirect("/");
  return (
    <main className="mx-auto w-full max-w-[1100px] min-w-0 px-4 pt-10 pb-16 md:px-8">
      <div className="mb-8">
        <h1 className="section-title">
          <Icon name="cursor" scale={4} />
          Дүрээ бүтээ
        </h1>
        <div className="rule" />
        <p className="m-0">
          Тавтай морил, {user.username}! Энэ бол таны дүр. Үс, нүд, хувцсаа сонгоод адал явдлаа эхлүүл.
          Даалгавар хийж цуглуулсан зоосоороо дараа нь шинэ эд зүйлс авч болно.
        </p>
      </div>
      <CharacterEditor initial={DEFAULT_AVATAR} owned={[]} coins={user.coins} mode="create" />
    </main>
  );
}
