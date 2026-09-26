"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getActiveCoach, getViewer } from "@/lib/auth";
import { isValidDateStr, localParts, todayIn, zonedTimeToUtc } from "@/lib/dates";
import { isR2Configured } from "@/lib/env";
import { notify } from "@/lib/notify";
import { deleteObject, promoteUpload } from "@/lib/r2";

const optNum = (max: number) =>
  z.preprocess((v) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v)), z.number().min(0).max(max).nullable());

const mealSchema = z.object({
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  caption: z.string().trim().max(500).default(""),
  portion: z.enum(["small", "medium", "large"]),
  tags: z.array(z.enum(["veg", "protein", "carbs", "fruit", "fiber", "fried", "sweet"])).max(7).default([]),
  date: z.string().optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  photo_staged_key: z.string().max(300).nullable().optional(),
  calories: optNum(5000),
  protein_g: optNum(500),
  carbs_g: optNum(1000),
  fat_g: optNum(400),
  ai_estimated: z.boolean().default(false),
  share_with_coach: z.boolean().default(true),
});

export type MealInput = z.input<typeof mealSchema>;

export async function createMeal(input: MealInput): Promise<{ error?: string; date?: string }> {
  const viewer = await getViewer();
  if (!viewer || !viewer.profile.is_member) return { error: "unauthorized" };
  const parsed = mealSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;
  const tz = viewer.profile.timezone;

  const date = isValidDateStr(d.date) ? d.date : todayIn(tz);
  const nowParts = localParts(new Date(), tz);
  const time = d.time ?? `${String(nowParts.hour).padStart(2, "0")}:${String(nowParts.minute).padStart(2, "0")}`;

  // Move the staged photo (tmp/<user>/…) into meals/. Only this user's staged files are accepted.
  let photo: { key: string; url: string } | null = null;
  if (d.photo_staged_key && isR2Configured()) {
    photo = await promoteUpload(d.photo_staged_key, viewer.userId, "meals").catch((err) => {
      console.error("[createMeal] promote failed", err);
      return null;
    });
    if (!photo) return { error: "photo_missing" };
  }

  const { error } = await viewer.supabase.from("meals").insert({
    user_id: viewer.userId,
    meal_type: d.meal_type,
    eaten_at: zonedTimeToUtc(date, time, tz).toISOString(),
    caption: d.caption,
    portion: d.portion,
    tags: d.tags,
    photo_key: photo?.key ?? null,
    photo_url: photo?.url ?? null,
    calories: d.calories === null ? null : Math.round(d.calories),
    protein_g: d.protein_g,
    carbs_g: d.carbs_g,
    fat_g: d.fat_g,
    ai_estimated: d.ai_estimated,
    share_with_coach: d.share_with_coach,
  });
  if (error) return { error: error.message };

  revalidatePath("/food");
  revalidatePath("/home");
  return { date };
}

export async function deleteMeal(mealId: string) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const { data: meal } = await viewer.supabase
    .from("meals")
    .select("id, photo_key")
    .eq("id", mealId)
    .eq("user_id", viewer.userId)
    .maybeSingle();
  if (!meal) return;
  await viewer.supabase.from("meals").delete().eq("id", mealId);
  if (meal.photo_key && isR2Configured()) {
    await deleteObject(meal.photo_key).catch(() => {});
  }
  revalidatePath("/food");
  revalidatePath("/home");
}

export async function addMealComment(mealId: string, body: string) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const text = body.trim().slice(0, 1000);
  if (!text) return { error: "empty" };

  const { data: meal } = await viewer.supabase.from("meals").select("id, user_id").eq("id", mealId).maybeSingle();
  if (!meal) return { error: "not_found" };

  const { error } = await viewer.supabase.from("meal_comments").insert({ meal_id: mealId, author_id: viewer.userId, body: text });
  if (error) return { error: error.message };

  if (meal.user_id !== viewer.userId) {
    await notify({ userId: meal.user_id, actorId: viewer.userId, kind: "comment", url: "/food", body: text });
  } else {
    const coach = await getActiveCoach(viewer);
    if (coach) {
      await notify({ userId: coach.id, actorId: viewer.userId, kind: "comment", url: `/coach/members/${viewer.userId}`, body: text, push: false });
    }
  }
  revalidatePath("/food");
  revalidatePath(`/coach/members/${meal.user_id}`);
  return { ok: true };
}

export async function toggleMealLike(mealId: string) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const { data: existing } = await viewer.supabase
    .from("meal_likes")
    .select("meal_id")
    .eq("meal_id", mealId)
    .eq("user_id", viewer.userId)
    .maybeSingle();

  if (existing) {
    await viewer.supabase.from("meal_likes").delete().eq("meal_id", mealId).eq("user_id", viewer.userId);
  } else {
    const { error } = await viewer.supabase.from("meal_likes").insert({ meal_id: mealId, user_id: viewer.userId });
    if (!error) {
      const { data: meal } = await viewer.supabase.from("meals").select("user_id").eq("id", mealId).maybeSingle();
      if (meal && meal.user_id !== viewer.userId) {
        await notify({ userId: meal.user_id, actorId: viewer.userId, kind: "like", url: "/food" });
      }
    }
  }
  revalidatePath("/food");
  revalidatePath("/coach", "layout");
}
