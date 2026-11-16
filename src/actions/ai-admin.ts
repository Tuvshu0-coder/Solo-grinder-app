"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { aiEnabled, QuizError, reviewReport, setAiEnabled } from "@/lib/quiz";
import { back, int, str } from "./util";

const P = "/admin/ai";

export async function toggleAi() {
  await requireAdmin();
  const on = !(await aiEnabled());
  await setAiEnabled(on);
  revalidatePath("/", "layout");
  back(P, "msg", on ? "AI тест асаалттай боллоо." : "AI тест түр унтарлаа.");
}

export async function reviewReportAction(fd: FormData) {
  await requireAdmin();
  const accept = str(fd, "decision") === "accept";
  let text: string;
  try {
    const r = await reviewReport(int(fd, "reportId"), accept);
    text = accept
      ? `Буруу асуулт гэж баталгаажлаа. Асуулт дахин ашиглагдахгүй.${r.extraXp ? ` Оюутанд +${r.extraXp} XP олгов.` : ""}`
      : "Мэдээллийг татгалзлаа.";
  } catch (e) {
    back(P, "err", e instanceof QuizError ? e.message : "Алдаа гарлаа.");
  }
  back(P, "msg", text);
}
