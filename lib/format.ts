import type { DictKey, TFunction } from "@/lib/i18n";
import type { Exercise, Locale, Reminder, WorkoutItem } from "@/lib/types";
import { hhmm } from "@/lib/dates";

export function firstName(fullName: string | null | undefined): string {
  const n = (fullName ?? "").trim();
  return n ? n.split(/\s+/)[0] : "Beru";
}

export function initialOf(fullName: string | null | undefined): string {
  return (fullName ?? "?").trim().charAt(0).toUpperCase() || "?";
}

type ExLike = Pick<Exercise, "sets" | "reps" | "duration_sec" | "minutes" | "name_id" | "name_en">;

export function exerciseName(ex: Pick<ExLike, "name_id" | "name_en">, locale: Locale): string {
  return locale === "en" ? ex.name_en || ex.name_id : ex.name_id || ex.name_en;
}

/** "3 × 12 repetisi" / "3 × 30 detik" / "30 menit" */
export function exerciseMeta(ex: Pick<ExLike, "sets" | "reps" | "duration_sec" | "minutes">, t: TFunction): string {
  if (ex.sets && ex.reps) return t("ex.reps", { s: ex.sets, r: ex.reps });
  if (ex.sets && ex.duration_sec) return t("ex.secs", { s: ex.sets, d: ex.duration_sec });
  return t("ex.mins", { m: ex.minutes });
}

export function itemMinutes(items: Pick<WorkoutItem, "minutes" | "done_at">[], onlyDone = false): number {
  return items.filter((i) => !onlyDone || i.done_at).reduce((a, i) => a + i.minutes, 0);
}

export function reminderDays(r: Pick<Reminder, "days" | "repeat_every_min" | "repeat_until">, t: TFunction): string {
  const d = [...r.days].sort().join(",");
  let base: string;
  if (d === "0,1,2,3,4,5,6") base = t("rem.everyDay");
  else if (d === "1,2,3,4,5") base = t("rem.weekdays");
  else if (d === "0,6") base = t("rem.weekend");
  else base = [...r.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((x) => t(`weekday.${x}` as DictKey)).join(", ");
  if (r.repeat_every_min && r.repeat_until) {
    const every =
      r.repeat_every_min % 60 === 0
        ? t("rem.every", { n: r.repeat_every_min / 60, until: hhmm(r.repeat_until) })
        : t("rem.everyMin", { n: r.repeat_every_min, until: hhmm(r.repeat_until) });
    return d === "0,1,2,3,4,5,6" ? every : `${base} · ${every}`;
  }
  return base;
}

export function relativeUntil(minutes: number, t: TFunction): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? t("common.inHM", { h, m }) : t("common.inM", { m });
}

export function relativeAgo(iso: string, t: TFunction, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return t("common.justNow");
  if (mins < 60) return t("common.agoM", { n: mins });
  const h = Math.round(mins / 60);
  if (h < 24) return t("common.agoH", { n: h });
  if (h < 48) return t("common.yesterday");
  return new Date(iso).toLocaleDateString();
}

export function round1(n: number | null | undefined): number {
  return Math.round((Number(n) || 0) * 10) / 10;
}

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export const PORTIONS = ["small", "medium", "large"] as const;
export const MEAL_TAGS = ["veg", "protein", "carbs", "fruit", "fiber", "fried", "sweet"] as const;
export const CATEGORIES = ["sport", "cardio", "strength", "flexibility"] as const;
export const INTENSITIES = ["light", "medium", "hard"] as const;

/** Which meal type fits the current local hour. */
export function mealTypeForHour(hour: number): (typeof MEAL_TYPES)[number] {
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}
