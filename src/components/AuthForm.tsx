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
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-3xl font-black tracking-tight">
            <span className="text-accent">SOLO</span> GRINDING
          </div>
          <p className="mt-2 text-sm text-muted">Хичээлээ эрт хий. Level ахи. Guild-ээ ялуул.</p>
        </div>
        <div className="card">
          <h1 className="mb-4 text-lg font-semibold">{title}</h1>
          <Flash searchParams={searchParams} />
          <form action={action} className="space-y-3">
            <div>
              <label className="label" htmlFor="username">Нэвтрэх нэр</label>
              <input id="username" name="username" className="input" required autoComplete="username" />
            </div>
            <div>
              <label className="label" htmlFor="password">Нууц үг</label>
              <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
            </div>
            <button className="btn w-full py-2">{submit}</button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          {alt.text}{" "}
          <Link href={alt.href} className="text-accent-2 hover:underline">{alt.link}</Link>
        </p>
      </div>
    </main>
  );
}
