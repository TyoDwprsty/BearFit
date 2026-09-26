"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";

const reminderSchema = z
  .object({
    id: z.uuid().optional(),
    user_id: z.uuid().optional(),
    label: z.string().trim().min(1).max(80),
    kind: z.enum(["workout", "water", "meal", "stretch", "recap", "custom"]),
    remind_time: z.string().regex(/^\d{2}:\d{2}$/),
    days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    repeat_every_min: z.number().int().min(15).max(720).nullable(),
    repeat_until: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  })
  .refine((r) => !r.repeat_every_min || (r.repeat_until && r.repeat_until > r.remind_time), {
    message: "repeat_until must be after remind_time",
  });

export type ReminderInput = z.input<typeof reminderSchema>;

function revalidate() {
  revalidatePath("/reminders");
  revalidatePath("/home");
}

export async function saveReminder(input: ReminderInput) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const parsed = reminderSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { id, user_id, ...fields } = parsed.data;
  const row = {
    ...fields,
    days: [...new Set(fields.days)].sort(),
    repeat_until: fields.repeat_every_min ? fields.repeat_until : null,
  };

  if (id) {
    const { error } = await viewer.supabase.from("reminders").update(row).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await viewer.supabase
      .from("reminders")
      .insert({ ...row, user_id: user_id ?? viewer.userId, created_by: viewer.userId, enabled: true });
    if (error) return { error: error.message };
  }
  revalidate();
  return { ok: true };
}

export async function toggleReminder(id: string, enabled: boolean) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  await viewer.supabase.from("reminders").update({ enabled, snooze_until: null }).eq("id", id);
  revalidate();
}

export async function deleteReminder(id: string) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  await viewer.supabase.from("reminders").delete().eq("id", id);
  revalidate();
}

export async function snoozeReminder(id: string) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const minutes = viewer.profile.alarm_snooze_min || 10;
  await viewer.supabase
    .from("reminders")
    .update({ snooze_until: new Date(Date.now() + minutes * 60_000).toISOString() })
    .eq("id", id)
    .eq("user_id", viewer.userId);
  return { minutes };
}
