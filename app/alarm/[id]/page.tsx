import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { formatClock, formatLongDate, todayIn } from "@/lib/dates";
import { firstName } from "@/lib/format";
import { alarmTarget } from "@/lib/reminders";
import type { Reminder } from "@/lib/types";
import { AlarmScreen } from "./AlarmScreen";

export const metadata = { title: "Alarm" };

export default async function AlarmPage({ params, searchParams }: PageProps<"/alarm/[id]">) {
  const viewer = await requireViewer("member");
  const { id } = await params;
  const sp = await searchParams;
  const { data } = await viewer.supabase.from("reminders").select("*").eq("id", id).eq("user_id", viewer.userId).maybeSingle();
  if (!data) notFound();
  const reminder = data as Reminder;
  const { profile } = viewer;

  return (
    <AlarmScreen
      reminder={{ id: reminder.id, label: reminder.label, kind: reminder.kind }}
      dateLabel={formatLongDate(todayIn(profile.timezone), profile.locale)}
      timeLabel={sp.preview ? reminder.remind_time.slice(0, 5) : formatClock(new Date().toISOString(), profile.timezone, "en")}
      name={firstName(profile.full_name)}
      startHref={alarmTarget(reminder.kind)}
      tone={profile.alarm_tone}
      vibrate={profile.alarm_vibrate}
      snoozeMin={profile.alarm_snooze_min}
      preview={!!sp.preview}
    />
  );
}
