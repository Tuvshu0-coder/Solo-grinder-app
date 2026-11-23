import Link from "next/link";
import { Flash, type SP } from "./ui";

export function AuthForm({
  title,
  action,
  submit,
  alt,
  searchParams,
}: {
  title: string;
  action: (fd: FormData) => Promise<void>;
  submit: string;
  alt: { href: string; text: string; link: string };
  searchParams: SP;
}) {
  return (
    <main className="scene flex min-h-screen items-center justify-center px-4">
      <div className="scene-text w-full max-w-[450px]">
        <div className="mb-6 text-center">
          <div className="text-3xl">
            <b>SOLO</b> GRINDING
          </div>
          <p className="m-0 mt-2">Finish your work early. Level up. Carry your guild.</p>
        </div>
        <h1 className="scene-rule">{title}</h1>
        <Flash searchParams={searchParams} />
        <form action={action} className="grid gap-5">
          <div>
            <label className="scene-label" htmlFor="username">Username</label>
            <input id="username" name="username" className="scene-input" required autoComplete="username" />
          </div>
          <div>
            <label className="scene-label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="scene-input" required autoComplete="current-password" />
          </div>
          <button className="btn-sec mt-2 w-full">{submit}</button>
        </form>
        <p className="mt-6 text-center">
          {alt.text}{" "}
          <Link href={alt.href} className="underline">{alt.link}</Link>
        </p>
      </div>
    </main>
  );
}
