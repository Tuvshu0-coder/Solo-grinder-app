"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { back, str } from "./util";

export async function login(fd: FormData) {
  const username = str(fd, "username");
  const password = str(fd, "password");
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password)))
    back("/login", "err", "Wrong username or password.");
  if (user.isSuspended) back("/login", "err", "Your account is suspended.");
  await createSession(user.id);
  redirect(user.role === "ADMIN" ? "/admin" : "/");
}

export async function register(fd: FormData) {
  const username = str(fd, "username");
  const password = str(fd, "password");
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))
    back("/register", "err", "Username must be 3–20 characters (latin letters, digits, _).");
  if (password.length < 6) back("/register", "err", "Password must be at least 6 characters.");
  if (await prisma.user.findUnique({ where: { username } }))
    back("/register", "err", "That username is taken.");
  const user = await prisma.user.create({
    data: { username, password: await bcrypt.hash(password, 10) },
  });
  await createSession(user.id);
  redirect("/subjects?msg=" + encodeURIComponent("Welcome! Start by adding your subjects."));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
