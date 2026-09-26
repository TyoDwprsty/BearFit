import { createAdminClient } from "@/lib/supabase/server";
import { isPlaceholder, serverEnv } from "@/lib/env";
import { localParts } from "@/lib/dates";
import { makeT, normalizeLocale, type DictKey } from "@/lib/i18n";
import { firstName } from "@/lib/format";
import { sendPushToUser } from "@/lib/push";
import { isDueAt } from "@/lib/reminders";
import type { Reminder } from "@/lib/types";

export const maxDuration = 30;

type Row = Reminder & {
  profiles: { timezone: string; locale: string; full_name: string; alarm_vibrate: boolean; alarm_snooze_min: number } | null;
};

/**
 * Called every minute by Supabase pg_cron (see supabase/reminder_cron.sql).
 * Fires due reminders and snoozed alarms as web push notifications.
 */
async function run(request: Request) {
  const auth = request.headers.get("authorization");
  if (isPlaceholder(serverEnv.cronSecret) || auth !== `Bearer ${serverEnv.cronSecret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const { data, error } = await admin
    .from("reminders")
    .select("*, profiles!reminders_user_id_fkey(timezone, locale, full_name, alarm_vibrate, alarm_snooze_min)")
    .or(`enabled.eq.true,snooze_until.lte.${now.toISOString()}`);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const due: Row[] = [];
  for (const r of (data ?? []) as Row[]) {
    const tz = r.profiles?.timezone || "Asia/Jakarta";
    const recentlyFired = r.last_fired_at && now.getTime() - new Date(r.last_fired_at).getTime() < 55_000;
    if (recentlyFired) continue;

    const snoozeDue = r.snooze_until && new Date(r.snooze_until) <= now;
    const { weekday, hour, minute } = localParts(now, tz);
    if (snoozeDue || (r.enabled && isDueAt(r, weekday, hour * 60 + minute))) due.push(r);
  }

  let sent = 0;
  await Promise.all(
    due.map(async (r) => {
      const t = makeT(normalizeLocale(r.profiles?.locale));
      const name = firstName(r.profiles?.full_name);
      const titleKey: DictKey =
        r.kind === "water" ? "alarm.title.water" : r.kind === "meal" ? "alarm.title.meal" : r.kind === "recap" ? "alarm.title.recap" : "alarm.title";
      const res = await sendPushToUser(admin, r.user_id, {
        title: t(titleKey, { name }),
        body: r.label,
        url: `/alarm/${r.id}`,
        tag: `alarm-${r.id}`,
        type: "alarm",
        reminderId: r.id,
        vibrate: r.profiles?.alarm_vibrate ?? true,
        actionOpen: t("alarm.start"),
        actionSnooze: t("alarm.snooze", { n: r.profiles?.alarm_snooze_min ?? 10 }),
      });
      sent += res.sent;
      await admin.from("reminders").update({ last_fired_at: now.toISOString(), snooze_until: null }).eq("id", r.id);
    }),
  );

  return Response.json({ checked: data?.length ?? 0, fired: due.length, sent });
}

export const GET = run;
export const POST = run;
