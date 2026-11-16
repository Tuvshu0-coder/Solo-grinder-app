import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { quizBlockFor, quizzesToday } from "@/lib/quiz";
import { QUIZ_PER_DAY, QUIZ_WINDOW_MS, quizGrade, quizReward } from "@/lib/quiz-rules";
import { QUIZ_OUTCOMES, REPORT_STATUS } from "@/lib/labels";
import { fmt } from "@/lib/time";
import { startQuizAction, reportAction } from "@/actions/quiz";
import { Flash, PageTitle, type SP } from "@/components/ui";
import { QuizRunner } from "@/components/QuizRunner";
import { PendingButton } from "@/components/PendingButton";

type Params = Promise<{ taskId: string }>;

export default async function QuizPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const user = await requireUser();
  const taskId = Number.parseInt((await params).taskId, 10);
  const task = Number.isInteger(taskId)
    ? await prisma.task.findFirst({
        where: { id: taskId, subject: { userId: user.id } },
        include: {
          subject: true,
          quizAttempt: {
            include: { answers: { orderBy: { position: "asc" }, include: { question: true, report: true } } },
          },
        },
      })
    : null;
  if (!task) notFound();
  const attempt = task.quizAttempt;

  return (
    <>
      <PageTitle sub={`${task.subject.name} · ${task.topic || "сэдэвгүй"} · ${task.title}`}>AI тест</PageTitle>
      <Flash searchParams={searchParams} />

      {!attempt && <Intro userId={user.id} task={task} />}
      {attempt?.status === "IN_PROGRESS" && <QuizRunner attemptId={attempt.id} />}
      {attempt?.status === "FINISHED" && (
        <>
          <section className="panel mb-8">
            <div className="panel-head mint">
              <span>Үр дүн: {quizGrade(attempt.score)}</span>
              <span>{fmt(attempt.finishedAt)}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
              <span className="text-4xl">{attempt.score}/{attempt.answers.length}</span>
              <span className="text-violet-dark">+{attempt.xpEarned} XP</span>
              {attempt.xpEarned < quizReward(attempt.score) && (
                <span className="text-butter-dark">өдрийн 400 XP хязгаарын улмаас {quizReward(attempt.score) - attempt.xpEarned} XP тасарсан</span>
              )}
            </div>
            <p className="muted mb-0">
              Буруу гэж үзсэн асуултаа доор мэдээлж болно. Админ баталгаажуулбал зөвд тооцож XP-г дахин олгоно.
            </p>
          </section>

          <ol className="m-0 grid list-none gap-6 p-0">
            {attempt.answers.map((a) => {
              const options: string[] = JSON.parse(a.question.options);
              return (
                <li key={a.id} className="panel">
                  <div className="panel-head">
                    <span>Асуулт {a.position + 1}</span>
                    <span>{a.isCorrect ? "Зөв" : QUIZ_OUTCOMES[a.outcome ?? ""] ?? "—"}</span>
                  </div>
                  <p className="mt-0">{a.question.question}</p>
                  <ul className="m-0 grid list-none gap-1 p-0">
                    {options.map((o, i) => (
                      <li key={i} className={i === a.question.correctIndex ? "text-violet-dark" : i === a.chosenIndex ? "text-rose" : "muted"}>
                        {i === a.question.correctIndex ? "✔ " : i === a.chosenIndex ? "✘ " : "· "}
                        {o}
                        {i === a.chosenIndex && <span className="muted"> (таны хариулт)</span>}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    {a.report ? (
                      <span className={`badge ${a.report.status === "ACCEPTED" ? "badge-violet" : a.report.status === "REJECTED" ? "badge-rose" : "badge-butter"}`}>
                        Мэдээлсэн: {REPORT_STATUS[a.report.status]}
                      </span>
                    ) : (
                      <details>
                        <summary className="muted cursor-pointer">Энэ асуулт буруу байна гэж мэдээлэх</summary>
                        <form action={reportAction} className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                          <input type="hidden" name="taskId" value={task.id} />
                          <input type="hidden" name="answerId" value={a.id} />
                          <div>
                            <label className="label">Шалтгаан</label>
                            <input name="reason" className="input" required minLength={3} maxLength={500} placeholder="ж: Зөв хариулт нь Б байх ёстой" />
                          </div>
                          <button className="btn-sec">Мэдээлэх</button>
                        </form>
                      </details>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <p className="mt-8">
        <Link href="/tasks?f=done" className="text-violet-dark">← Дууссан даалгаврууд</Link>
      </p>
    </>
  );
}

async function Intro({ userId, task }: { userId: number; task: { id: number; completedAt: Date | null } }) {
  const [blocked, today] = await Promise.all([quizBlockFor(userId, task.id), quizzesToday(userId)]);
  const until = task.completedAt ? new Date(task.completedAt.getTime() + QUIZ_WINDOW_MS) : null;
  return (
    <section className="panel">
      <div className="panel-head mint">
        <span>Дүрэм</span>
        <span>Өнөөдөр {today}/{QUIZ_PER_DAY}</span>
      </div>
      <ul className="mt-0">
        <li>Сэдвээр 4 сонголттой 5 асуулт (Google Gemini). Тест өгөх нь заавал биш.</li>
        <li>Асуулт бүрт 30 секунд. Хариултаа буцааж засах боломжгүй.</li>
        <li>Хугацаандаа хариулаагүй эсвэл хуудаснаас (өөр таб руу) гарсан асуулт буруу тооцогдоно.</li>
        <li>5/5 → +25 XP · 4/5 → +15 XP · 3/5 → +5 XP · 0–2 → 0 XP. Буруу хариултаар XP хасахгүй.</li>
        <li>Даалгавар бүрт нэг удаа{until && <>, {fmt(until)}-аас өмнө</>}.</li>
      </ul>
      {blocked ? (
        <div className="dialog text-rose" role="alert">{blocked}</div>
      ) : (
        <form action={startQuizAction}>
          <input type="hidden" name="taskId" value={task.id} />
          <PendingButton pending="Асуулт бэлдэж байна…">Тест эхлүүлэх</PendingButton>
        </form>
      )}
    </section>
  );
}
