import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { aiConfigured } from "@/lib/gemini";
import { aiEnabled } from "@/lib/quiz";
import { REPORT_STATUS } from "@/lib/labels";
import { dayKey, dayStart, fmt } from "@/lib/time";
import { reviewReportAction, toggleAi } from "@/actions/ai-admin";
import { Flash, PageTitle, type SP } from "@/components/ui";

export default async function AdminAi({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const todayStart = dayStart(dayKey());

  const [enabled, testsToday, errorsToday, generatedToday, reusedToday, rejectedToday, avgAll, avgToday, pending, reviewed, lastErrors] =
    await Promise.all([
      aiEnabled(),
      prisma.quizAttempt.count({ where: { startedAt: { gte: todayStart } } }),
      prisma.aiLog.count({ where: { kind: "ERROR", createdAt: { gte: todayStart } } }),
      prisma.aiLog.count({ where: { kind: "GENERATED", createdAt: { gte: todayStart } } }),
      prisma.aiLog.count({ where: { kind: "REUSED", createdAt: { gte: todayStart } } }),
      prisma.aiLog.count({ where: { kind: "REJECTED_TOPIC", createdAt: { gte: todayStart } } }),
      prisma.quizAttempt.aggregate({ where: { status: "FINISHED" }, _avg: { score: true }, _count: true }),
      prisma.quizAttempt.aggregate({ where: { status: "FINISHED", finishedAt: { gte: todayStart } }, _avg: { score: true } }),
      prisma.quizReport.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: { user: true, answer: { include: { question: true, attempt: true } } },
      }),
      prisma.quizReport.findMany({
        where: { status: { not: "PENDING" } },
        orderBy: { reviewedAt: "desc" },
        take: 20,
        include: { user: true, answer: { include: { question: true, attempt: true } } },
      }),
      prisma.aiLog.findMany({ where: { kind: "ERROR" }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

  const avg = (v: number | null | undefined) => (v == null ? "—" : `${v.toFixed(1)}/5`);

  const stats = [
    ["Өнөөдрийн тест", testsToday],
    ["Gemini алдаа (өнөөдөр)", errorsToday],
    ["Дундаж оноо (нийт)", avg(avgAll._avg.score)],
    ["Дундаж оноо (өнөөдөр)", avg(avgToday._avg.score)],
    ["Шинээр үүсгэсэн", generatedToday],
    ["Дахин ашигласан", reusedToday],
    ["Сэдэв татгалзсан", rejectedToday],
    ["Хянах мэдээлэл", pending.length],
  ] as const;

  return (
    <>
      <PageTitle sub={`Нийт ${avgAll._count} тест дууссан. Gemini руу зөвхөн хичээлийн нэр, сэдэв, зэрэглэл илгээгдэнэ.`}>AI тест</PageTitle>
      <Flash searchParams={searchParams} />

      <section className="panel mb-8">
        <div className="panel-head mint">
          <span>Төлөв: {enabled ? "Асаалттай" : "Түр унтраасан"}</span>
          <form action={toggleAi}>
            <button className={enabled ? "btn-danger" : "btn"}>{enabled ? "Түр унтраах" : "Асаах"}</button>
          </form>
        </div>
        {!aiConfigured() && (
          <p className="m-0 text-rose">
            GEMINI_API_KEY тохируулаагүй байна — оюутнууд «Тест одоогоор боломжгүй» мэдэгдэл харна. `.env` файлд түлхүүрээ нэмнэ үү.
          </p>
        )}
        {process.env.AI_QUIZ_MOCK === "1" && <p className="m-0 text-butter-dark">AI_QUIZ_MOCK=1 — туршилтын (жинхэнэ биш) асуулт үүсгэж байна.</p>}
        {lastErrors.length > 0 && (
          <details className="mt-2">
            <summary className="muted cursor-pointer">Сүүлийн алдаанууд</summary>
            <ul className="m-0">
              {lastErrors.map((e) => (
                <li key={e.id} className="muted">{fmt(e.createdAt)} — {e.detail}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="card">
            <div className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
            <div className="text-sm text-muted">{label}</div>
          </div>
        ))}
      </div>

      <h2 className="card-title">Мэдээлэгдсэн асуулт ({pending.length})</h2>
      {pending.length === 0 && <p className="muted">Хянах мэдээлэл алга.</p>}
      <div className="mb-8 grid gap-4">
        {pending.map((r) => (
          <ReportCard key={r.id} r={r} />
        ))}
      </div>

      {reviewed.length > 0 && (
        <>
          <h2 className="card-title">Хянасан</h2>
          <div className="grid gap-4">
            {reviewed.map((r) => (
              <ReportCard key={r.id} r={r} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

type R = {
  id: number;
  status: string;
  reason: string;
  createdAt: Date;
  user: { username: string };
  answer: {
    chosenIndex: number | null;
    outcome: string | null;
    question: { question: string; options: string; correctIndex: number };
    attempt: { subjectName: string; topic: string };
  };
};

function ReportCard({ r }: { r: R }) {
  const options: string[] = JSON.parse(r.answer.question.options);
  return (
    <div className="panel">
      <div className="panel-head">
        <span>{r.answer.attempt.subjectName} · {r.answer.attempt.topic}</span>
        <span>{r.user.username} · {fmt(r.createdAt)}</span>
      </div>
      <p className="mt-0">{r.answer.question.question}</p>
      <ul className="mt-0 grid list-none gap-1 p-0">
        {options.map((o, i) => (
          <li key={i} className={i === r.answer.question.correctIndex ? "text-violet-dark" : i === r.answer.chosenIndex ? "text-rose" : "muted"}>
            {i === r.answer.question.correctIndex ? "✔ (AI-ийн зөв) " : i === r.answer.chosenIndex ? "✘ (оюутны хариулт) " : "· "}
            {o}
          </li>
        ))}
        {r.answer.chosenIndex == null && <li className="muted">Оюутан хариулаагүй ({r.answer.outcome})</li>}
      </ul>
      <p className="mb-3">
        <span className="muted">Шалтгаан:</span> {r.reason}
      </p>
      {r.status === "PENDING" ? (
        <div className="flex flex-wrap gap-3">
          <form action={reviewReportAction}>
            <input type="hidden" name="reportId" value={r.id} />
            <input type="hidden" name="decision" value="accept" />
            <button className="btn">Буруу асуулт — зөвд тооцох</button>
          </form>
          <form action={reviewReportAction}>
            <input type="hidden" name="reportId" value={r.id} />
            <input type="hidden" name="decision" value="reject" />
            <button className="btn-sec">Татгалзах</button>
          </form>
        </div>
      ) : (
        <span className={`badge ${r.status === "ACCEPTED" ? "badge-violet" : "badge-rose"}`}>{REPORT_STATUS[r.status]}</span>
      )}
    </div>
  );
}
