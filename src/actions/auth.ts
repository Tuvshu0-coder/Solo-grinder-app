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
    back("/login", "err", "Нэвтрэх нэр эсвэл нууц үг буруу байна.");
  if (user.isSuspended) back("/login", "err", "Таны бүртгэл түдгэлзүүлэгдсэн байна.");
  await createSession(user.id);
  redirect(user.role === "ADMIN" ? "/admin" : "/");
}

export async function register(fd: FormData) {
  const username = str(fd, "username");
  const password = str(fd, "password");
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))
    back("/register", "err", "Нэвтрэх нэр 3–20 тэмдэгт (латин үсэг, тоо, _) байна.");
  if (password.length < 6) back("/register", "err", "Нууц үг хамгийн багадаа 6 тэмдэгт байна.");
  if (await prisma.user.findUnique({ where: { username } }))
    back("/register", "err", "Энэ нэвтрэх нэр бүртгэлтэй байна.");
  const user = await prisma.user.create({
    data: { username, password: await bcrypt.hash(password, 10) },
  });
  await createSession(user.id);
  redirect("/subjects?msg=" + encodeURIComponent("Тавтай морил! Эхлээд хичээлүүдээ нэмнэ үү."));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
