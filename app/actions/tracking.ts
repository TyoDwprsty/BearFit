"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { isValidDateStr, todayIn } from "@/lib/dates";

async function member() {
  const viewer = await getViewer();
  if (!viewer || !viewer.profile.is_member) redirect("/");
  return viewer;
}

/** +1 / −1 glass of water for today. Returns the new count. */
export async function changeWater(delta: 1 | -1, date?: string) {
  const { supabase, userId, profile } = await member();
  const day = isValidDateStr(date) ? date : todayIn(profile.timezone);
  const { data } = await supabase.from("water_logs").select("glasses").eq("user_id", userId).eq("log_date", day).maybeSingle();
  const glasses = Math.max(0, Math.min(30, (data?.glasses ?? 0) + delta));
  await supabase.from("water_logs").upsert({ user_id: userId, log_date: day, glasses }, { onConflict: "user_id,log_date" });
  revalidatePath("/home");
  return glasses;
}

const weightSchema = z.coerce.number().min(20).max(400);

export async function logWeight(_prev: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  const { supabase, userId, profile } = await member();
  const parsed = weightSchema.safeParse(String(formData.get("weight_kg") ?? "").replace(",", "."));
  if (!parsed.success) return { error: "invalid" };
  await supabase
    .from("weight_logs")
    .upsert(
      { user_id: userId, log_date: todayIn(profile.timezone), weight_kg: Math.round(parsed.data * 10) / 10 },
      { onConflict: "user_id,log_date" },
    );
  revalidatePath("/progress");
  return { ok: true };
}

const targetsSchema = z.object({
  kcal: z.coerce.number().int().min(800).max(6000),
  protein_g: z.coerce.number().int().min(0).max(500),
  carbs_g: z.coerce.number().int().min(0).max(1000),
  fat_g: z.coerce.number().int().min(0).max(400),
  workout_min: z.coerce.number().int().min(5).max(300),
  water_glasses: z.coerce.number().int().min(1).max(30),
  meals: z.coerce.number().int().min(1).max(8),
  target_weight_kg: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(20).max(400).nullable()),
});

/** Update daily targets. Works for the member themself or their coach (RLS). */
export async function saveTargets(_prev: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const userId = String(formData.get("user_id") || viewer.userId);
  const parsed = targetsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const { error } = await viewer.supabase
    .from("targets")
    .update({ ...parsed.data, updated_by: viewer.userId, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath(`/coach/members/${userId}`);
  revalidatePath("/home");
  return { ok: true };
}
