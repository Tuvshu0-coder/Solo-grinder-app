import { redirect } from "next/navigation";

export function back(path: string, kind: "err" | "msg", text: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(text)}`);
}

export function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export function int(fd: FormData, key: string): number {
  return Number.parseInt(str(fd, key), 10);
}
