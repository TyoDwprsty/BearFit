"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { snoozeReminder } from "@/app/actions/reminders";
import { changeWater } from "@/app/actions/tracking";
import { Beru } from "@/components/Beru";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { startAlarmSound } from "@/lib/alarm-sound";
import type { DictKey } from "@/lib/i18n";
import type { ReminderKind } from "@/lib/types";
import { startNavigation, useProgress } from "@/components/feedback/NavigationProgress";

/** Full-screen ringing alarm (design: 07 · Alarm Berbunyi). */
export function AlarmScreen({
  reminder,
  dateLabel,
  timeLabel,
  name,
  startHref,
  tone,
  vibrate,
  snoozeMin,
  preview,
}: {
  reminder: { id: string; label: string; kind: ReminderKind };
  dateLabel: string;
  timeLabel: string;
  name: string;
  startHref: string;
  tone: string;
  vibrate: boolean;
  snoozeMin: number;
  preview: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const stopRef = useRef<(() => void) | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [pending, start] = useTransition();
  useProgress(pending);

  const play = async () => {
    try {
      stopRef.current?.();
      stopRef.current = await startAlarmSound(tone, vibrate);
      setBlocked(false);
    } catch {
      setBlocked(true);
    }
  };
  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
  };

  useEffect(() => {
    let cancelled = false;
    startAlarmSound(tone, vibrate)
      .then((s) => {
        if (cancelled) s();
        else stopRef.current = s;
      })
      .catch(() => !cancelled && setBlocked(true));
    // Auto-stop after 2 minutes so the phone doesn't ring forever.
    const timeout = window.setTimeout(() => {
      stopRef.current?.();
      stopRef.current = null;
    }, 120_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      stopRef.current?.();
    };
  }, [tone, vibrate]);

  const titleKey: DictKey =
    reminder.kind === "water" ? "alarm.title.water" : reminder.kind === "meal" ? "alarm.title.meal" : reminder.kind === "recap" ? "alarm.title.recap" : "alarm.title";

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-[#6A5AE0] px-6 pt-[max(54px,env(safe-area-inset-top))] pb-[max(36px,env(safe-area-inset-bottom))] text-white">
      <span className="absolute top-[150px] left-[30px] h-[22px] w-[22px] rotate-[20deg] rounded-[7px] bg-[#FFC940]" />
      <span className="absolute top-[180px] right-[34px] h-4 w-4 rounded-full bg-[#3CCB9A]" />
      <span className="absolute top-[420px] left-11 h-2.5 w-7 -rotate-[30deg] rounded-[5px] bg-[#FF8A3D]" />
      <span className="absolute top-[400px] right-10 h-3.5 w-3.5 rotate-[35deg] rounded bg-[#FF6B8B]" />
      <span className="absolute top-[70px] right-[90px] h-3 w-3 rounded-full bg-[#4DB5FF]" />

      <span className="text-sm font-bold">{dateLabel}</span>
      <span className="mt-1 font-display text-[84px] leading-none font-bold">{timeLabel}</span>

      <div className="relative mt-5 flex h-[260px] w-[260px] items-center justify-center rounded-full bg-white/15">
        <span className="animate-pulse-ring absolute inset-0 rounded-full border-4 border-white/40" />
        <div className="flex h-[226px] w-[226px] items-center justify-center rounded-full border-2 border-white/30">
          <Beru pose="cheer" size={210} className="animate-beru" />
        </div>
      </div>

      <h1 className="mt-[22px] text-center font-display text-[30px] font-semibold">{t(titleKey, { name })}</h1>
      <p className="mt-2 max-w-[300px] text-center text-[15px] leading-relaxed">{t("alarm.body", { label: reminder.label })}</p>

      {blocked && (
        <button
          type="button"
          onClick={play}
          className="mt-4 flex min-h-11 items-center gap-2 rounded-full bg-white/20 px-4 text-sm font-bold backdrop-blur"
        >
          <Icon name="sound" size={18} /> {t("alarm.tapSound")}
        </button>
      )}
      {snoozed && <p className="mt-4 rounded-full bg-white/20 px-4 py-2 text-sm font-bold">{t("alarm.snoozed", { n: snoozeMin })}</p>}

      <div className="mt-auto flex w-full max-w-md flex-col gap-2.5 pt-8">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              stop();
              if (reminder.kind === "water" && !preview) await changeWater(1);
              router.replace(startHref);
            })
          }
          className="flex h-[58px] items-center justify-center rounded-[20px] bg-[#FF8A3D] font-display text-[19px] font-semibold text-[#2B2335] transition active:scale-[0.98]"
        >
          {reminder.kind === "water" ? t("alarm.drink") : t("alarm.start")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              stop();
              if (!preview) await snoozeReminder(reminder.id);
              setSnoozed(true);
              window.setTimeout(() => {
                startNavigation();
                router.replace("/home");
              }, 1200);
            })
          }
          className="flex h-[58px] items-center justify-center rounded-[20px] border-2 border-white/75 font-display text-[19px] font-semibold transition active:scale-[0.98]"
        >
          {preview ? t("alarm.dismiss") : t("alarm.snooze", { n: snoozeMin })}
        </button>
      </div>
    </main>
  );
}
