"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { isValidDateStr } from "@/lib/dates";
import { notify } from "@/lib/notify";

async function coach() {
  const viewer = await getViewer();
  if (!viewer || !viewer.profile.is_coach) redirect("/");
  return viewer;
}

// ─── Programs ──────────────────────────────────────────────────────────
const programSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(400).optional(),
  weeks: z.coerce.number().int().min(1).max(52),
});

export async function createProgram(formData: FormData) {
  const viewer = await coach();
  const parsed = programSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { data } = await viewer.supabase
    .from("programs")
    .insert({ ...parsed.data, description: parsed.data.description || null, coach_id: viewer.userId })
    .select("id")
    .single();
  revalidatePath("/coach/programs");
  if (data) redirect(`/coach/programs/${data.id}`);
}

export async function updateProgram(programId: string, formData: FormData) {
  const viewer = await coach();
  const parsed = programSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await viewer.supabase
    .from("programs")
    .update({ ...parsed.data, description: parsed.data.description || null })
    .eq("id", programId);
  revalidatePath(`/coach/programs/${programId}`);
  revalidatePath("/coach/programs");
}

export async function deleteProgram(programId: string) {
  const viewer = await coach();
  await viewer.supabase.from("programs").delete().eq("id", programId);
  revalidatePath("/coach/programs");
  redirect("/coach/programs");
}

export async function toggleProgramExercise(programId: string, day: number, exerciseId: string) {
  const viewer = await coach();
  if (day < 0 || day > 6) return;
  const db = viewer.supabase;
  const { data: existing } = await db
    .from("program_items")
    .select("id")
    .eq("program_id", programId)
    .eq("day_of_week", day)
    .eq("exercise_id", exerciseId)
    .limit(1);
  if (existing?.length) {
    await db.from("program_items").delete().eq("id", existing[0].id);
  } else {
    const { count } = await db
      .from("program_items")
      .select("id", { count: "exact", head: true })
      .eq("program_id", programId)
      .eq("day_of_week", day);
    await db.from("program_items").insert({ program_id: programId, day_of_week: day, exercise_id: exerciseId, position: count ?? 0 });
  }
  revalidatePath(`/coach/programs/${programId}`);
}

export async function assignProgram(memberId: string, formData: FormData) {
  const viewer = await coach();
  const programId = String(formData.get("program_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  if (!programId || !isValidDateStr(startDate)) return;
  const db = viewer.supabase;
  await db.from("member_programs").update({ active: false }).eq("member_id", memberId).eq("coach_id", viewer.userId).eq("active", true);
  const { error } = await db
    .from("member_programs")
    .insert({ member_id: memberId, program_id: programId, coach_id: viewer.userId, start_date: startDate, active: true });
  if (!error) {
    await notify({ userId: memberId, actorId: viewer.userId, kind: "plan", url: "/workout" });
  }
  revalidatePath(`/coach/members/${memberId}`);
  revalidatePath("/coach/programs");
}

/** From the program page: assign this program to one of the coach's members. */
export async function assignProgramToMember(programId: string, formData: FormData) {
  const memberId = String(formData.get("member_id") ?? "");
  if (!memberId) return;
  formData.set("program_id", programId);
  await assignProgram(memberId, formData);
  revalidatePath(`/coach/programs/${programId}`);
}

export async function unassignProgram(memberId: string) {
  const viewer = await coach();
  await viewer.supabase.from("member_programs").update({ active: false }).eq("member_id", memberId).eq("coach_id", viewer.userId).eq("active", true);
  revalidatePath(`/coach/members/${memberId}`);
  revalidatePath("/coach/programs", "layout");
}

// ─── Custom exercises ─────────────────────────────────────────────────
const optInt = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(1).max(max).nullable());

const exerciseSchema = z.object({
  name_id: z.string().trim().min(1).max(60),
  name_en: z.string().trim().max(60).optional(),
  category: z.enum(["cardio", "strength", "flexibility"]),
  intensity: z.enum(["light", "medium", "hard"]),
  sets: optInt(20),
  reps: optInt(200),
  duration_sec: optInt(3600),
  minutes: z.coerce.number().int().min(1).max(300),
  video_url: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : null),
    z.string().max(500).regex(/^https:\/\//, "https only").nullable(),
  ),
});

export async function createExercise(_prev: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  const viewer = await coach();
  const parsed = exerciseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;
  const { error } = await viewer.supabase.from("exercises").insert({
    ...d,
    name_en: d.name_en || d.name_id,
    reps: d.sets ? d.reps : null,
    duration_sec: d.sets && !d.reps ? d.duration_sec : null,
    created_by: viewer.userId,
  });
  if (error) return { error: error.message };
  revalidatePath("/coach/exercises");
  return { ok: true };
}

export async function deleteExercise(exerciseId: string) {
  const viewer = await coach();
  await viewer.supabase.from("exercises").delete().eq("id", exerciseId).eq("created_by", viewer.userId);
  revalidatePath("/coach/exercises");
}
