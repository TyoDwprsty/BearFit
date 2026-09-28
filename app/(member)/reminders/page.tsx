import Link from "next/link";
import { Beru } from "@/components/Beru";
import { Icon } from "@/components/Icon";
import { PushToggle } from "@/components/pwa/PushToggle";
import { AlarmSettings } from "@/components/reminders/AlarmSettings";
import { ReminderList } from "@/components/reminders/ReminderList";
import { PageTitle, SectionTitle } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { formatClock } from "@/lib/dates";
import { reminderDays, relativeUntil } from "@/lib/format";
import { makeT } from "@/lib/i18n";
import { nextOccurrence } from "@/lib/reminders";
import type { Reminder } from "@/lib/types";

export const metadata = { title: "Pengingat" };

export default async function RemindersPage() {
  const viewer = await requireViewer("member");
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);

  const { data } = await supabase.from("reminders").select("*").eq("user_id", userId).order("remind_time");
  const reminders = (data ?? []) as Reminder[];
  const next = nextOccurrence(reminders, new Date(), profile.timezone);

  return (
    <div className="flex flex-col gap-4">
      <PageTitle eyebrow={t("rem.subtitle")} title={t("rem.title")} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1 rounded-[28px] bg-sun-s py-[18px] pr-2 pl-5">
            <div className="flex flex-1 flex-col gap-1">
              <span className="self-start rounded-full bg-sun px-2.5 py-1 text-[11px] font-extrabold text-ink">{t("rem.next")}</span>
              {next ? (
                <>
                  <span className="font-display text-[56px] leading-none font-semibold">{formatClock(next.at.toISOString(), profile.timezone, "en")}</span>
                  <span className="text-sm font-bold">{next.reminder.label}</span>
                  <span className="text-xs font-medium text-muted">
                    {reminderDays(next.reminder, t)} · {relativeUntil(next.minutesUntil, t)}
                  </span>
                  <Link
                    href={`/alarm/${next.reminder.id}?preview=1`}
                    className="mt-1.5 flex min-h-11 items-center gap-1.5 self-start rounded-[14px] bg-card px-3.5 text-[13px] font-bold"
                  >
                    <Icon name="sound" size={16} strokeWidth={2} />
                    {t("rem.preview")}
                  </Link>
                </>
              ) : (
                <span className="py-3 font-display text-xl font-semibold">{t("home.noReminder")}</span>
              )}
            </div>
            <Beru pose="alarm" size={128} />
          </div>

          <PushToggle variant="card" />

          <SectionTitle>{t("rem.schedule")}</SectionTitle>
          <ReminderList reminders={reminders} />
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-10">
          <AlarmSettings tone={profile.alarm_tone} snooze={profile.alarm_snooze_min} vibrate={profile.alarm_vibrate} />
        </div>
      </div>
    </div>
  );
}
