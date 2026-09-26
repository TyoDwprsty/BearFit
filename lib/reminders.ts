import type { Reminder } from "@/lib/types";
import { addDays, localParts, minutesOfDay, weekdayOf, zonedTimeToUtc } from "@/lib/dates";

type ScheduleFields = Pick<Reminder, "remind_time" | "days" | "repeat_every_min" | "repeat_until">;

/** All minute-of-day slots a reminder fires at on an active day. */
export function slotsOf(r: ScheduleFields): number[] {
  const start = minutesOfDay(r.remind_time);
  if (!r.repeat_every_min || !r.repeat_until) return [start];
  const end = minutesOfDay(r.repeat_until);
  const out: number[] = [];
  for (let m = start; m <= end; m += r.repeat_every_min) out.push(m);
  return out;
}

/** Whether a reminder should fire at the given local wall-clock minute. */
export function isDueAt(r: ScheduleFields, weekday: number, minuteOfDay: number): boolean {
  if (!r.days.includes(weekday)) return false;
  return slotsOf(r).includes(minuteOfDay);
}

export interface NextOccurrence {
  reminder: Reminder;
  at: Date;
  minutesUntil: number;
}

/** Next firing across all enabled reminders within the coming week. */
export function nextOccurrence(reminders: Reminder[], now: Date, timeZone: string): NextOccurrence | null {
  const { dateStr: today } = localParts(now, timeZone);
  let best: NextOccurrence | null = null;
  for (const r of reminders) {
    if (!r.enabled) continue;
    for (let off = 0; off < 8; off++) {
      const date = addDays(today, off);
      if (!r.days.includes(weekdayOf(date))) continue;
      const slot = slotsOf(r).find((m) => {
        const at = zonedTimeToUtc(date, `${Math.floor(m / 60)}:${m % 60}`, timeZone);
        return at.getTime() > now.getTime();
      });
      if (slot === undefined) continue;
      const at = zonedTimeToUtc(date, `${Math.floor(slot / 60)}:${slot % 60}`, timeZone);
      if (!best || at < best.at) {
        best = { reminder: r, at, minutesUntil: Math.ceil((at.getTime() - now.getTime()) / 60000) };
      }
      break;
    }
  }
  return best;
}

export function slotLabel(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

/** Where "Start now" on the alarm screen should lead. */
export function alarmTarget(kind: Reminder["kind"]): string {
  switch (kind) {
    case "meal":
      return "/food/new";
    case "recap":
      return "/progress";
    case "water":
      return "/home";
    default:
      return "/workout";
  }
}

/** Default reminders created for a new member (from the design). */
export const DEFAULT_REMINDERS = [
  { kind: "stretch", key: "rem.default.stretch", remind_time: "06:30", days: [1, 2, 3, 4, 5] },
  { kind: "water", key: "rem.default.water", remind_time: "10:00", days: [0, 1, 2, 3, 4, 5, 6], repeat_every_min: 120, repeat_until: "20:00" },
  { kind: "meal", key: "rem.default.lunch", remind_time: "12:00", days: [0, 1, 2, 3, 4, 5, 6] },
  { kind: "workout", key: "rem.default.workout", remind_time: "17:30", days: [0, 1, 2, 3, 4, 5, 6] },
  { kind: "recap", key: "rem.default.recap", remind_time: "21:00", days: [0, 1, 2, 3, 4, 5, 6], enabled: false },
] as const;
