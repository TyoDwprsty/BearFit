"use server";

import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getViewer, homeFor } from "@/lib/auth";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";
import { normalizeTheme, THEME_COOKIE } from "@/lib/theme";
import type { Role } from "@/lib/types";

const YEAR = 60 * 60 * 24 * 365;

export async function setLocale(value: string) {
  const locale = normalizeLocale(value);
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: YEAR, sameSite: "lax" });
  const viewer = await getViewer();
  if (viewer) await viewer.supabase.from("profiles").update({ locale }).eq("id", viewer.userId);
  revalidatePath("/", "layout");
}

export async function setTheme(value: string) {
  const store = await cookies();
  store.set(THEME_COOKIE, normalizeTheme(value), { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}

/** Switch between member & coach mode (only if the user has both roles). */
export async function switchRole(role: Role) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const allowed = role === "coach" ? viewer.profile.is_coach : viewer.profile.is_member;
  if (!allowed) redirect(homeFor(viewer.profile));
  await viewer.supabase.from("profiles").update({ active_role: role }).eq("id", viewer.userId);
  redirect(role === "coach" ? "/coach" : "/home", RedirectType.replace);
}

/** Turn on the other role later (e.g. a member who becomes a coach). */
export async function enableRole(role: Role) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const patch = role === "coach" ? { is_coach: true, active_role: "coach" } : { is_member: true, active_role: "member" };
  await viewer.supabase.from("profiles").update(patch).eq("id", viewer.userId);
  redirect(role === "coach" ? "/coach" : "/home", RedirectType.replace);
}

export async function updateProfileBasics(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const full_name = String(formData.get("full_name") ?? "").trim().slice(0, 80);
  const coach_bio = String(formData.get("coach_bio") ?? "").trim().slice(0, 240);
  const patch: Record<string, string | null> = {};
  if (full_name) patch.full_name = full_name;
  if (viewer.profile.is_coach) patch.coach_bio = coach_bio || null;
  await viewer.supabase.from("profiles").update(patch).eq("id", viewer.userId);
  revalidatePath("/profile");
}

export async function updateAlarmSettings(patch: { alarm_vibrate?: boolean; alarm_snooze_min?: number; alarm_tone?: string }) {
  const viewer = await getViewer();
  if (!viewer) return;
  const clean: typeof patch = {};
  if (typeof patch.alarm_vibrate === "boolean") clean.alarm_vibrate = patch.alarm_vibrate;
  if (patch.alarm_snooze_min && [5, 10, 15, 20, 30].includes(patch.alarm_snooze_min)) clean.alarm_snooze_min = patch.alarm_snooze_min;
  if (patch.alarm_tone && ["beru", "soft", "classic"].includes(patch.alarm_tone)) clean.alarm_tone = patch.alarm_tone;
  await viewer.supabase.from("profiles").update(clean).eq("id", viewer.userId);
  revalidatePath("/reminders");
}
