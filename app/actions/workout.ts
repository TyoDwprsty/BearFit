"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { isValidDateStr } from "@/lib/dates";
import { itemFromExercise } from "@/lib/data";
import { notify } from "@/lib/notify";
import type { Exercise } from "@/lib/types";

async function viewerFor(memberId: string) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const isSelf = viewer.userId === memberId;
  if (!isSelf) {
    const { data: link } = await viewer.supabase
      .from("coach_links")
      .select("id")
      .eq("coach_id", viewer.userId)
      .eq("member_id", memberId)
      .eq("status", "active")
      .maybeSingle();
    if (!link) throw new Error("forbidden");
  }
  return { viewer, isSelf };
}

async function ensurePlan(memberId: string, date: string) {
  const { viewer, isSelf } = await viewerFor(memberId);
  const { data: existing } = await viewer.supabase
    .from("workout_plans")
    .select("id, source")
    .eq("member_id", memberId)
    .eq("plan_date", date)
    .maybeSingle();
  if (existing) {
    if (!isSelf && existing.source === "member") {
      await viewer.supabase.from("workout_plans").update({ source: "coach", updated_at: new Date().toISOString() }).eq("id", existing.id);
    }
    return { viewer, planId: existing.id as string };
  }
  const { data: plan, error } = await viewer.supabase
    .from("workout_plans")
    .insert({ member_id: memberId, plan_date: date, source: isSelf ? "member" : "coach", created_by: viewer.userId })
    .select("id")
    .single();
  if (error || !plan) {
    const { data: again } = await viewer.supabase
      .from("workout_plans")
      .select("id")
      .eq("member_id", memberId)
      .eq("plan_date", date)
      .single();
    return { viewer, planId: again!.id as string };
  }
  return { viewer, planId: plan.id as string };
}

function revalidate(memberId: string) {
  revalidatePath("/workout");
  revalidatePath("/home");
  revalidatePath(`/coach/members/${memberId}`, "layout");
}

/** Add the exercise to the day's plan, or remove it if it's already there. */
export async function toggleExercise(memberId: string, date: string, exerciseId: string) {
  if (!isValidDateStr(date)) return;
  const { viewer, planId } = await ensurePlan(memberId, date);
  const db = viewer.supabase;

  const { data: existing } = await db.from("workout_items").select("id").eq("plan_id", planId).eq("exercise_id", exerciseId).limit(1);
  if (existing?.length) {
    await db.from("workout_items").delete().eq("id", existing[0].id);
  } else {
    const { data: ex } = await db.from("exercises").select("*").eq("id", exerciseId).single<Exercise>();
    if (!ex) return;
    const { count } = await db.from("workout_items").select("id", { count: "exact", head: true }).eq("plan_id", planId);
    await db.from("workout_items").insert(itemFromExercise(ex, planId, count ?? 0, viewer.userId));
  }
  revalidate(memberId);
}

export async function toggleItemDone(itemId: string, done: boolean) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const { data: item } = await viewer.supabase
    .from("workout_items")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", itemId)
    .select("plan_id, workout_plans(member_id)")
    .single();
  const memberId = (item?.workout_plans as unknown as { member_id: string } | null)?.member_id ?? viewer.userId;
  revalidate(memberId);
}

export async function removeItem(itemId: string) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  await viewer.supabase.from("workout_items").delete().eq("id", itemId);
  revalidatePath("/workout");
  revalidatePath("/coach", "layout");
}

/** Coach: save the plan note and notify the member. */
export async function publishPlan(memberId: string, date: string, note: string) {
  if (!isValidDateStr(date)) return { error: "invalid" };
  const { viewer, planId } = await ensurePlan(memberId, date);
  await viewer.supabase
    .from("workout_plans")
    .update({ note: note.trim().slice(0, 500) || null, updated_at: new Date().toISOString() })
    .eq("id", planId);
  if (viewer.userId !== memberId) {
    await notify({ userId: memberId, actorId: viewer.userId, kind: "plan", url: `/workout?date=${date}`, body: note.trim() || undefined });
  }
  revalidate(memberId);
  return { ok: true };
}
