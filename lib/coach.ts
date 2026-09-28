import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { diffDays, localDateOf, todayIn, weekdayOf } from "@/lib/dates";
import type { MemberProgram, Profile, Program } from "@/lib/types";

export type MemberRow = Pick<Profile, "id" | "full_name" | "avatar_url" | "timezone" | "locale"> & {
  linkId: string;
  since: string;
};

/** Active members of a coach. */
export async function getCoachMembers(db: SupabaseClient, coachId: string): Promise<MemberRow[]> {
  const { data: links } = await db
    .from("coach_links")
    .select("id, member_id, created_at")
    .eq("coach_id", coachId)
    .eq("status", "active")
    .order("created_at");
  if (!links?.length) return [];
  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name, avatar_url, timezone, locale")
    .in("id", links.map((l) => l.member_id));
  return links
    .map((l) => {
      const p = profiles?.find((x) => x.id === l.member_id);
      return p ? ({ ...p, linkId: l.id, since: l.created_at } as MemberRow) : null;
    })
    .filter((x): x is MemberRow => !!x);
}

/** Ensures the member is actively coached by `coachId`; 404 otherwise. */
export async function requireMember(db: SupabaseClient, coachId: string, memberId: string) {
  const members = await getCoachMembers(db, coachId);
  const m = members.find((x) => x.id === memberId);
  if (!m) notFound();
  return m;
}

export interface MemberToday {
  mealsToday: number;
  itemsTotal: number;
  itemsDone: number;
  lastActivity: string | null;
  status: "done" | "partial" | "mealsOnly" | "noPlan" | "none";
  needsCheck: boolean;
}

/** Today's snapshot for each member (dashboard cards). */
export async function getMembersToday(db: SupabaseClient, members: MemberRow[]) {
  const out = new Map<string, MemberToday>();
  if (!members.length) return out;
  const ids = members.map((m) => m.id);
  const since = new Date(Date.now() - 36 * 3600_000).toISOString();
  const todays = new Map(members.map((m) => [m.id, todayIn(m.timezone)]));

  const [{ data: meals }, { data: plans }, { data: programs }] = await Promise.all([
    db.from("meals").select("user_id, eaten_at, created_at").in("user_id", ids).gte("eaten_at", since),
    db
      .from("workout_plans")
      .select("member_id, plan_date, workout_items(done_at)")
      .in("member_id", ids)
      .in("plan_date", [...new Set(todays.values())]),
    // Active programs: today's workouts exist even before the member opens the app.
    db
      .from("member_programs")
      .select("member_id, start_date, programs(weeks, program_items(day_of_week))")
      .in("member_id", ids)
      .eq("active", true),
  ]);
  const programFor = new Map(
    ((programs ?? []) as unknown as { member_id: string; start_date: string; programs: { weeks: number | null; program_items: { day_of_week: number }[] } | null }[]).map(
      (p) => [p.member_id, p],
    ),
  );

  for (const m of members) {
    const today = todays.get(m.id)!;
    const myMeals = (meals ?? []).filter((x) => x.user_id === m.id && localDateOf(x.eaten_at, m.timezone) === today);
    const plan = (plans ?? []).find((p) => p.member_id === m.id && p.plan_date === today) as
      | { workout_items: { done_at: string | null }[] }
      | undefined;
    let items = plan?.workout_items ?? [];
    if (!plan) {
      const p = programFor.get(m.id);
      const day = p ? diffDays(today, p.start_date) : -1;
      if (p?.programs && day >= 0 && (p.programs.weeks == null || day < p.programs.weeks * 7)) {
        const wd = weekdayOf(today);
        items = p.programs.program_items.filter((i) => i.day_of_week === wd).map(() => ({ done_at: null }));
      }
    }
    const done = items.filter((i) => i.done_at);
    const times = [...myMeals.map((x) => x.created_at as string), ...done.map((i) => i.done_at!)].sort();
    const lastActivity = times.at(-1) ?? null;

    let status: MemberToday["status"];
    if (items.length && done.length === items.length) status = "done";
    else if (done.length) status = "partial";
    else if (myMeals.length) status = "mealsOnly";
    else if (!items.length) status = "noPlan";
    else status = "none";

    out.set(m.id, {
      mealsToday: myMeals.length,
      itemsTotal: items.length,
      itemsDone: done.length,
      lastActivity,
      status,
      needsCheck: !lastActivity,
    });
  }
  return out;
}

/** "Day N" label basis: program day if in a program, else days since joining. */
export function memberDay(since: string, tz: string, program: { assignment: MemberProgram; program: Program } | null) {
  const today = todayIn(tz);
  if (program) {
    const d = diffDays(today, program.assignment.start_date) + 1;
    if (d >= 1 && (program.program.weeks == null || d <= program.program.weeks * 7)) return { day: d, program: program.program.name };
  }
  return { day: Math.max(1, diffDays(today, localDateOf(since, tz)) + 1), program: null };
}
