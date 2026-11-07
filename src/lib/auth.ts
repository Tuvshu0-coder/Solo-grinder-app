import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { DAY } from "./time";
import { ensureDailyQuests, runMaintenance } from "./game";

const COOKIE = "sg_session";
const SESSION_MS = 30 * DAY;

export async function createSession(userId: number) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await prisma.session.create({ data: { id, userId, expiresAt } });
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await prisma.session.deleteMany({ where: { id } });
  jar.delete(COOKIE);
}

export async function currentUser() {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return null;
  const session = await prisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || session.user.isSuspended) return null;
  return session.user;
}

/** For every logged-in page: runs the lazy nightly job and assigns today's quests (section 10, step 1). */
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  await runMaintenance();
  if (user.role === "STUDENT") await ensureDailyQuests(user.id);
  return prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { level: true } });
}

export async function requireAdmin() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");
  await runMaintenance();
  return user;
}
