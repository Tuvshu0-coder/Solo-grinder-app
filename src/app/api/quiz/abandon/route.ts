// Called with fetch(keepalive) when the student leaves the quiz page (rule 26).
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { abandonQuestion } from "@/lib/quiz";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "STUDENT") return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const attemptId = Number(body?.attemptId);
  if (!Number.isInteger(attemptId)) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    await abandonQuestion(user.id, attemptId);
  } catch {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
