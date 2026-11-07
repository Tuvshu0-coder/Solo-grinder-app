import { completeTaskAction } from "@/actions/student";
import { TASK_STATUS, TASK_TYPES, type TaskType } from "@/lib/labels";
import { fmt, HOUR } from "@/lib/time";
import { Icon } from "./pixel";

export function timeLeft(deadline: Date, now = new Date()): { text: string; tone: string } {
  const ms = deadline.getTime() - now.getTime();
  const abs = Math.abs(ms);
  const d = Math.floor(abs / (24 * HOUR));
  const h = Math.floor((abs % (24 * HOUR)) / HOUR);
  const span = d > 0 ? `${d} хоног ${h} цаг` : `${h} цаг`;
  if (ms < 0) return { text: `${span} хоцорсон`, tone: "text-rose" };
  if (ms < 24 * HOUR) return { text: `${span} үлдсэн`, tone: "text-butter-dark" };
  return { text: `${span} үлдсэн`, tone: "muted" };
}

export function StatusBadge({ status }: { status: string }) {
  const cls = status === "DONE" ? "badge-violet" : status === "LATE" ? "badge-rose" : "";
  return <span className={`badge ${cls}`}>{TASK_STATUS[status] ?? status}</span>;
}

export function CompleteButton({ id, returnTo }: { id: number; returnTo: string }) {
  return (
    <form action={completeTaskAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button className="btn">
        <Icon name="check" scale={2} /> Дууссан
      </button>
    </form>
  );
}

export function TaskSummary({
  task,
  compact,
}: {
  task: { title: string; type: string; deadline: Date; status: string; subject: { name: string } };
  compact?: boolean;
}) {
  const left = timeLeft(task.deadline);
  if (compact) {
    return (
      <div className="min-w-0">
        <div className="truncate">{task.title}</div>
        <div className="flex flex-wrap gap-x-4">
          <span className="muted truncate">{task.subject.name}</span>
          {task.status !== "DONE" && <span className={left.tone}>{left.text}</span>}
        </div>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <div className="truncate">{task.title}</div>
      <div className="flex flex-wrap gap-x-4">
        <span className="muted">{task.subject.name}</span>
        <span className="muted">{TASK_TYPES[task.type as TaskType] ?? task.type}</span>
        <span className="muted">{fmt(task.deadline)}</span>
        {task.status !== "DONE" && <span className={left.tone}>{left.text}</span>}
      </div>
    </div>
  );
}
