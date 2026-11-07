import { completeTaskAction } from "@/actions/student";
import { TASK_STATUS, TASK_TYPES, type TaskType } from "@/lib/labels";
import { fmt, HOUR } from "@/lib/time";

export function timeLeft(deadline: Date, now = new Date()): { text: string; tone: string } {
  const ms = deadline.getTime() - now.getTime();
  const abs = Math.abs(ms);
  const d = Math.floor(abs / (24 * HOUR));
  const h = Math.floor((abs % (24 * HOUR)) / HOUR);
  const span = d > 0 ? `${d} хоног ${h} цаг` : `${h} цаг`;
  if (ms < 0) return { text: `${span} хоцорсон`, tone: "text-bad" };
  if (ms < 24 * HOUR) return { text: `${span} үлдсэн`, tone: "text-warn" };
  return { text: `${span} үлдсэн`, tone: "text-muted" };
}

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "DONE" ? "bg-good/15 text-good" : status === "LATE" ? "bg-bad/15 text-bad" : "bg-accent-2/15 text-accent-2";
  return <span className={`badge ${cls}`}>{TASK_STATUS[status] ?? status}</span>;
}

export function CompleteButton({ id, returnTo }: { id: number; returnTo: string }) {
  return (
    <form action={completeTaskAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button className="btn">✓ Дууссан</button>
    </form>
  );
}

export function TaskSummary({
  task,
}: {
  task: { title: string; type: string; deadline: Date; status: string; subject: { name: string } };
}) {
  const left = timeLeft(task.deadline);
  return (
    <div className="min-w-0">
      <div className="truncate font-medium">{task.title}</div>
      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
        <span>{task.subject.name}</span>
        <span>{TASK_TYPES[task.type as TaskType] ?? task.type}</span>
        <span>{fmt(task.deadline)}</span>
        {task.status !== "DONE" && <span className={left.tone}>{left.text}</span>}
      </div>
    </div>
  );
}
