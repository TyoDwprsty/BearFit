import type { Exercise } from "@/lib/types";

/** How much of a workout: "3 × 12", "3 × 30 s" or "45 min". */
export interface Dose {
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  minutes: number;
}

type Base = Pick<Exercise, "sets" | "reps" | "duration_sec" | "minutes">;
export type DoseKind = "reps" | "timed" | "minutes";
export type Level = "beginner" | "experienced" | "pro";
export const LEVELS: Level[] = ["beginner", "experienced", "pro"];

export const DOSE_LIMITS = {
  sets: { min: 1, max: 20, step: 1 },
  reps: { min: 1, max: 200, step: 1 },
  duration_sec: { min: 5, max: 600, step: 5 },
  minutes: { min: 5, max: 300, step: 5 },
} as const;

const REST_SEC = 15; // matches the workout timer's rest between timed sets

export function doseKind(ex: Base): DoseKind {
  if (ex.sets && ex.reps) return "reps";
  if (ex.sets && ex.duration_sec) return "timed";
  return "minutes";
}

const clamp = (n: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, Math.round(n)));
const to5 = (n: number) => Math.round(n / 5) * 5;

/**
 * Minutes for a dose. Timed sets add up exactly (work + rests); rep sets scale gently
 * from the catalog's own estimate, since more reps don't take proportionally longer.
 */
function doseMinutes(ex: Base, d: Omit<Dose, "minutes"> & { minutes?: number }): number {
  switch (doseKind(ex)) {
    case "timed":
      return Math.max(1, Math.ceil((d.sets! * d.duration_sec! + (d.sets! - 1) * REST_SEC) / 60));
    case "reps":
      return Math.max(1, Math.round(ex.minutes * Math.sqrt((d.sets! * d.reps!) / (ex.sets! * ex.reps!))));
    default:
      return d.minutes ?? ex.minutes;
  }
}

/** Catalog values are the "experienced" dose; the other levels scale from them. */
export function levelDose(ex: Base, level: Level): Dose {
  const kind = doseKind(ex);
  if (kind === "minutes") {
    const f = { beginner: 0.5, experienced: 1, pro: 1.5 }[level];
    return { sets: null, reps: null, duration_sec: null, minutes: clamp(to5(ex.minutes * f), DOSE_LIMITS.minutes) };
  }
  const sets = clamp(ex.sets! + { beginner: -1, experienced: 0, pro: 1 }[level], DOSE_LIMITS.sets);
  if (kind === "reps") {
    const reps = clamp(ex.reps! * { beginner: 2 / 3, experienced: 1, pro: 1.5 }[level], DOSE_LIMITS.reps);
    return { sets, reps, duration_sec: null, minutes: doseMinutes(ex, { sets, reps, duration_sec: null }) };
  }
  const secs = level === "experienced" ? ex.duration_sec! : to5(ex.duration_sec! * (level === "beginner" ? 2 / 3 : 1.5));
  const duration_sec = clamp(secs, DOSE_LIMITS.duration_sec);
  return { sets, reps: null, duration_sec, minutes: doseMinutes(ex, { sets, reps: null, duration_sec }) };
}

/** Which preset a dose matches, or "custom" once the user has tweaked it. */
export function levelOf(ex: Base, d: Dose): Level | "custom" {
  const same = (a: Dose) => a.sets === d.sets && a.reps === d.reps && a.duration_sec === d.duration_sec && a.minutes === d.minutes;
  return LEVELS.find((l) => same(levelDose(ex, l))) ?? "custom";
}

/**
 * Coerces user input into a valid dose for `ex`: only the fields its kind uses,
 * within limits, with minutes recomputed. Used on both client and server.
 */
export function normalizeDose(ex: Base, input: Partial<Dose>): Dose {
  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
  const kind = doseKind(ex);
  if (kind === "minutes") {
    return { sets: null, reps: null, duration_sec: null, minutes: clamp(num(input.minutes, ex.minutes), { min: 1, max: DOSE_LIMITS.minutes.max }) };
  }
  const sets = clamp(num(input.sets, ex.sets!), DOSE_LIMITS.sets);
  if (kind === "reps") {
    const reps = clamp(num(input.reps, ex.reps!), DOSE_LIMITS.reps);
    return { sets, reps, duration_sec: null, minutes: doseMinutes(ex, { sets, reps, duration_sec: null }) };
  }
  const duration_sec = clamp(num(input.duration_sec, ex.duration_sec!), DOSE_LIMITS.duration_sec);
  return { sets, reps: null, duration_sec, minutes: doseMinutes(ex, { sets, reps: null, duration_sec }) };
}
