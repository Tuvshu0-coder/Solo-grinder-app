"use client";
// One question at a time, 30 s each, no going back (rule 26). The server owns the clock;
// this component only shows it and reports when the student leaves the page.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { answerAction, serveAction } from "@/actions/quiz";
import type { AnswerResult, ServeResult } from "@/lib/quiz";

function abandon(attemptId: number) {
  void fetch("/api/quiz/abandon", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId }),
  });
}

type Q = Extract<ServeResult, { done: false }>;
type Phase =
  | { kind: "loading" }
  | { kind: "question"; q: Q; deadline: number }
  | { kind: "feedback"; q: Q; chosen: number | null; r: AnswerResult }
  | { kind: "done" }
  | { kind: "error"; text: string };

export function QuizRunner({ attemptId }: { attemptId: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [now, setNow] = useState(() => Date.now());
  const [notice, setNotice] = useState<string | null>(null);
  const started = useRef(false);
  const busy = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const serve = useCallback(async () => {
    setPhase({ kind: "loading" });
    const r = await serveAction(attemptId);
    if ("error" in r) return setPhase({ kind: "error", text: r.error });
    if (r.done) {
      setPhase({ kind: "done" });
      router.refresh();
      return;
    }
    if (r.missed > 0) setNotice(`${r.missed} асуултын хугацаа дууссан тул буруу тооцогдлоо.`);
    setPhase({ kind: "question", q: r, deadline: Date.now() + r.remainingMs });
  }, [attemptId, router]);

  const submit = useCallback(
    async (choice: number | null) => {
      const p = phaseRef.current;
      if (p.kind !== "question" || busy.current) return;
      busy.current = true;
      const r = await answerAction(attemptId, p.q.position, choice);
      busy.current = false;
      if ("error" in r) return setPhase({ kind: "error", text: r.error });
      setPhase({ kind: "feedback", q: p.q, chosen: choice, r });
    },
    [attemptId],
  );

  // Load the current question once (guarded against React strict-mode double effects).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void serve();
  }, [serve]);

  // Countdown; an unanswered question is submitted as "no answer" when time runs out.
  useEffect(() => {
    if (phase.kind !== "question") return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= phase.deadline) void submit(null);
    }, 200);
    return () => clearInterval(id);
  }, [phase, submit]);

  // Leaving the page (tab switch, reload, navigation) while a question is shown counts it as wrong.
  useEffect(() => {
    const leave = () => {
      if (phaseRef.current.kind !== "question") return;
      abandon(attemptId);
      setNotice("Та тестийн хуудаснаас гарсан тул тухайн асуулт буруу тооцогдлоо.");
      setPhase({ kind: "loading" });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") leave();
      else if (phaseRef.current.kind === "loading" && started.current) void serve();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", leave);
    };
  }, [attemptId, serve]);

  // In-app navigation away (nav link) while a question is shown.
  useEffect(() => {
    return () => {
      if (phaseRef.current.kind === "question") abandon(attemptId);
    };
  }, [attemptId]);

  if (phase.kind === "loading") return <div className="panel">Ачаалж байна…</div>;
  if (phase.kind === "done") return <div className="panel">Тест дууслаа. Үр дүнг ачаалж байна…</div>;
  if (phase.kind === "error")
    return (
      <div className="dialog text-rose" role="alert">
        {phase.text}{" "}
        <button className="btn-sec ml-2" onClick={() => router.refresh()}>Дахин ачаалах</button>
      </div>
    );

  const q = phase.q;
  const secondsLeft = phase.kind === "question" ? Math.max(0, Math.ceil((phase.deadline - now) / 1000)) : 0;
  const pct = phase.kind === "question" ? Math.max(0, Math.min(100, ((phase.deadline - now) / 30000) * 100)) : 0;

  return (
    <section className="panel">
      <div className="panel-head">
        <span>Асуулт {q.position + 1}/{q.total}</span>
        {phase.kind === "question" && <span className={secondsLeft <= 10 ? "text-butter" : ""}>{secondsLeft} сек</span>}
      </div>
      {notice && <p className="m-0 mb-3 text-rose">{notice}</p>}
      {phase.kind === "question" && (
        <div className={`track mb-4 ${secondsLeft <= 10 ? "butter" : ""}`} aria-hidden>
          <i style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className="mt-0 mb-4 text-xl">{q.question}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {q.options.map((o, i) => {
          let cls = "btn-sec";
          if (phase.kind === "feedback") {
            if (i === phase.r.correctDisplayIndex) cls = "btn-buy";
            else if (i === phase.chosen) cls = "btn-danger";
          }
          return (
            <button
              key={i}
              className={`${cls} justify-start text-left`}
              disabled={phase.kind !== "question"}
              onClick={() => void submit(i)}
            >
              {String.fromCharCode(65 + i)}. {o}
            </button>
          );
        })}
      </div>
      {phase.kind === "feedback" && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className={phase.r.outcome === "CORRECT" ? "text-violet-dark" : "text-rose"}>
            {phase.r.outcome === "CORRECT" ? "Зөв!" : phase.r.outcome === "WRONG" ? "Буруу." : "Хугацаа дууссан."}
          </span>
          {phase.r.finished ? (
            <button className="btn" onClick={() => { setPhase({ kind: "done" }); router.refresh(); }}>
              Үр дүн харах
            </button>
          ) : (
            <button className="btn" onClick={() => { setNotice(null); void serve(); }}>
              Дараагийн асуулт
            </button>
          )}
        </div>
      )}
    </section>
  );
}
