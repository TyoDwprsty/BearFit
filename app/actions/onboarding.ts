"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { LOCALE_COOKIE, makeT } from "@/lib/i18n";
import { todayIn } from "@/lib/dates";
import { DEFAULT_REMINDERS } from "@/lib/reminders";

const num = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().min(min).max(max).optional());

const schema = z.object({
  full_name: z.string().trim().min(1).max(80),
  is_member: z.boolean(),
  is_coach: z.boolean(),
  preferred: z.enum(["member", "coach"]).optional(),
  locale: z.enum(["id", "en"]),
  timezone: z.string().max(64).optional(),
  coach_bio: z.string().max(240).optional(),
  weight_kg: num(20, 400),
  height_cm: num(80, 250),
  target_weight_kg: num(20, 400),
  kcal: num(800, 6000),
  water_glasses: num(1, 30),
  workout_min: num(5, 300),
  next: z.string().optional(),
});

export type OnboardingState = { error?: string } | undefined;

export async function completeOnboarding(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/");

  const parsed = schema.safeParse({
    full_name: formData.get("full_name"),
    is_member: formData.get("is_member") === "on",
    is_coach: formData.get("is_coach") === "on",
    preferred: formData.get("preferred") || undefined,
    locale: formData.get("locale") || "id",
    timezone: formData.get("timezone") || undefined,
    coach_bio: formData.get("coach_bio") || undefined,
    weight_kg: formData.get("weight_kg"),
    height_cm: formData.get("height_cm"),
    target_weight_kg: formData.get("target_weight_kg"),
    kcal: formData.get("kcal"),
    water_glasses: formData.get("water_glasses"),
    workout_min: formData.get("workout_min"),
    next: formData.get("next") || undefined,
  });
  const t = makeT(viewer.profile.locale);
  if (!parsed.success) return { error: t("common.error") };
  const d = parsed.data;
  if (!d.is_member && !d.is_coach) return { error: t("onb.pickRole") };

  let timezone = viewer.profile.timezone;
  try {
    if (d.timezone) {
      new Intl.DateTimeFormat("en-US", { timeZone: d.timezone });
      timezone = d.timezone;
    }
  } catch {
    // keep default timezone
  }

  const active_role = d.is_member && d.is_coach ? (d.preferred ?? "member") : d.is_coach ? "coach" : "member";
  const { supabase, userId } = viewer;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: d.full_name,
      is_member: d.is_member,
      is_coach: d.is_coach,
      active_role,
      onboarded: true,
      locale: d.locale,
      timezone,
      height_cm: d.height_cm ?? null,
      coach_bio: d.is_coach ? d.coach_bio?.trim() || null : null,
    })
    .eq("id", userId);
  if (error) return { error: t("common.error") };

  if (d.is_member) {
    const targetPatch: Record<string, number> = {};
    if (d.kcal) targetPatch.kcal = Math.round(d.kcal);
    if (d.water_glasses) targetPatch.water_glasses = Math.round(d.water_glasses);
    if (d.workout_min) targetPatch.workout_min = Math.round(d.workout_min);
    if (d.target_weight_kg) targetPatch.target_weight_kg = d.target_weight_kg;
    if (Object.keys(targetPatch).length) await supabase.from("targets").update(targetPatch).eq("user_id", userId);

    if (d.weight_kg) {
      await supabase
        .from("weight_logs")
        .upsert({ user_id: userId, log_date: todayIn(timezone), weight_kg: d.weight_kg }, { onConflict: "user_id,log_date" });
    }

    const { count } = await supabase.from("reminders").select("id", { count: "exact", head: true }).eq("user_id", userId);
    if (!count) {
      const lt = makeT(d.locale);
      await supabase.from("reminders").insert(
        DEFAULT_REMINDERS.map((r) => ({
          user_id: userId,
          kind: r.kind,
          label: lt(r.key),
          remind_time: r.remind_time,
          days: [...r.days],
          repeat_every_min: "repeat_every_min" in r ? r.repeat_every_min : null,
          repeat_until: "repeat_until" in r ? r.repeat_until : null,
          enabled: "enabled" in r ? r.enabled : true,
          created_by: userId,
        })),
      );
    }
  }

  const store = await cookies();
  store.set(LOCALE_COOKIE, d.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  if (d.next && d.next.startsWith("/") && !d.next.startsWith("//")) redirect(d.next);
  redirect(active_role === "coach" ? "/coach" : "/home");
}
