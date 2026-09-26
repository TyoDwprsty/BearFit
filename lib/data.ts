import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, dayRangeUtc, diffDays, localDateOf, rangeUtc, weekdayOf } from "@/lib/dates";
import type { Exercise, Meal, MemberProgram, Program, WorkoutItem, WorkoutPlan } from "@/lib/types";

type DB = SupabaseClient;

export async function getMealsForDay(db: DB, userId: string, date: string, tz: string) {
  const [from, to] = dayRangeUtc(date, tz);
  const { data } = await db
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .gte("eaten_at", from)
    .lt("eaten_at", to)
    .order("eaten_at", { ascending: true });
  return (data ?? []) as Meal[];
}

export async function getWater(db: DB, userId: string, date: string) {
  const { data } = await db.from("water_logs").select("glasses").eq("user_id", userId).eq("log_date", date).maybeSingle();
  return (data?.glasses as number | undefined) ?? 0;
}

export function sumNutrition(meals: Pick<Meal, "calories" | "protein_g" | "carbs_g" | "fat_g">[]) {
  return meals.reduce(
    (a, m) => ({
      kcal: a.kcal + (m.calories ?? 0),
      protein: a.protein + Number(m.protein_g ?? 0),
      carbs: a.carbs + Number(m.carbs_g ?? 0),
      fat: a.fat + Number(m.fat_g ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export async function getActiveProgram(db: DB, memberId: string) {
  const { data: mp } = await db
    .from("member_programs")
    .select("*")
    .eq("member_id", memberId)
    .eq("active", true)
    .maybeSingle();
  if (!mp) return null;
  const { data: program } = await db.from("programs").select("*").eq("id", mp.program_id).maybeSingle();
  if (!program) return null;
  return { assignment: mp as MemberProgram, program: program as Program };
}

/** 1-based day number within an assigned program (or null when outside it). */
export function programDay(assignment: MemberProgram, program: Program, date: string): number | null {
  const d = diffDays(date, assignment.start_date);
  if (d < 0 || d >= program.weeks * 7) return null;
  return d + 1;
}

export interface PlanWithItems {
  plan: WorkoutPlan | null;
  items: WorkoutItem[];
}

export async function getPlan(db: DB, memberId: string, date: string): Promise<PlanWithItems> {
  const { data: plan } = await db
    .from("workout_plans")
    .select("*")
    .eq("member_id", memberId)
    .eq("plan_date", date)
    .maybeSingle();
  if (!plan) return { plan: null, items: [] };
  const { data: items } = await db.from("workout_items").select("*").eq("plan_id", plan.id).order("position");
  return { plan: plan as WorkoutPlan, items: (items ?? []) as WorkoutItem[] };
}

/**
 * Returns the member's plan for a date. When none exists yet and the member
 * follows a program, the plan is created from that weekday's template.
 */
export async function ensurePlanFromProgram(db: DB, memberId: string, date: string): Promise<PlanWithItems> {
  const existing = await getPlan(db, memberId, date);
  if (existing.plan) return existing;

  const active = await getActiveProgram(db, memberId);
  if (!active || programDay(active.assignment, active.program, date) === null) return existing;

  const { data: tpl } = await db
    .from("program_items")
    .select("exercise_id, position, exercises(*)")
    .eq("program_id", active.program.id)
    .eq("day_of_week", weekdayOf(date))
    .order("position");
  const rows = (tpl ?? []) as unknown as { exercise_id: string; position: number; exercises: Exercise | null }[];
  if (!rows.length) return existing;

  const { data: plan, error } = await db
    .from("workout_plans")
    .insert({ member_id: memberId, plan_date: date, source: "program", created_by: active.assignment.coach_id })
    .select("*")
    .single();
  if (error || !plan) return getPlan(db, memberId, date); // raced with another request

  const items = rows
    .filter((r) => r.exercises)
    .map((r, i) => itemFromExercise(r.exercises!, plan.id, i, active.assignment.coach_id));
  if (items.length) await db.from("workout_items").insert(items);
  return getPlan(db, memberId, date);
}

export function itemFromExercise(ex: Exercise, planId: string, position: number, addedBy: string | null) {
  return {
    plan_id: planId,
    exercise_id: ex.id,
    name_id: ex.name_id,
    name_en: ex.name_en,
    category: ex.category,
    intensity: ex.intensity,
    sets: ex.sets,
    reps: ex.reps,
    duration_sec: ex.duration_sec,
    minutes: ex.minutes,
    position,
    added_by: addedBy,
  };
}

/** Exercises visible to the viewer: built-ins + own/coach's custom ones (RLS). */
export async function getExerciseCatalog(db: DB) {
  const { data } = await db.from("exercises").select("*").order("category").order("created_at");
  return (data ?? []) as Exercise[];
}

/**
 * Local dates (in tz) on which the user was active: posted a meal or
 * completed a workout item. Used for streaks and badges.
 */
export async function getActivity(db: DB, userId: string, tz: string, today: string, days = 120) {
  const [from, to] = rangeUtc(addDays(today, -days), addDays(today, 1), tz);
  const [{ data: meals }, { data: plans }] = await Promise.all([
    db.from("meals").select("eaten_at, tags").eq("user_id", userId).gte("eaten_at", from).lt("eaten_at", to),
    db
      .from("workout_plans")
      .select("plan_date, workout_items(minutes, done_at)")
      .eq("member_id", userId)
      .gte("plan_date", addDays(today, -days))
      .lte("plan_date", today),
  ]);

  const activeDates = new Set<string>();
  const minutesByDate = new Map<string, number>();
  let earlyWorkouts = 0;
  let veggieMeals = 0;

  for (const m of meals ?? []) {
    activeDates.add(localDateOf(m.eaten_at, tz));
    if ((m.tags as string[] | null)?.includes("veg")) veggieMeals++;
  }
  for (const p of (plans ?? []) as { plan_date: string; workout_items: { minutes: number; done_at: string | null }[] }[]) {
    for (const it of p.workout_items ?? []) {
      if (!it.done_at) continue;
      const d = localDateOf(it.done_at, tz);
      activeDates.add(d);
      minutesByDate.set(p.plan_date, (minutesByDate.get(p.plan_date) ?? 0) + it.minutes);
      const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date(it.done_at)));
      if (hour < 9) earlyWorkouts++;
    }
  }

  return { activeDates, minutesByDate, earlyWorkouts, veggieMeals, ...streaks(activeDates, today) };
}

export function streaks(active: Set<string>, today: string) {
  let current = 0;
  let cursor = active.has(today) ? today : addDays(today, -1);
  while (active.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...active].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && diffDays(d, prev) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current) };
}
