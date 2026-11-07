// All day/week boundaries use Mongolia time (UTC+8, no DST) — rule 5.
const MN_OFFSET_MS = 8 * 60 * 60 * 1000;
export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

/** YYYY-MM-DD of the given instant in Mongolia time. */
export function dayKey(d: Date = new Date()): string {
  return new Date(d.getTime() + MN_OFFSET_MS).toISOString().slice(0, 10);
}

/** UTC instant of 00:00 Mongolia time for a day key. */
export function dayStart(key: string): Date {
  return new Date(Date.parse(`${key}T00:00:00+08:00`));
}

export function addDays(key: string, n: number): string {
  return dayKey(new Date(dayStart(key).getTime() + n * DAY));
}

/** Day key of the Monday starting the week containing `d`. */
export function weekStartKey(d: Date = new Date()): string {
  const key = dayKey(d);
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0=Sun
  const back = (weekday + 6) % 7;
  return addDays(key, -back);
}

/** Format an instant for display in Mongolia time. */
export function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  const s = new Date(d.getTime() + MN_OFFSET_MS).toISOString();
  return `${s.slice(0, 10)} ${s.slice(11, 16)}`;
}

/** Value for <input type="datetime-local"> in Mongolia time. */
export function toLocalInput(d: Date): string {
  return new Date(d.getTime() + MN_OFFSET_MS).toISOString().slice(0, 16);
}

/** Parse <input type="datetime-local"> value as Mongolia time. */
export function fromLocalInput(v: string): Date {
  return new Date(Date.parse(`${v}:00+08:00`));
}
