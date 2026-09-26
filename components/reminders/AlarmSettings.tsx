"use client";

import { useRef, useState, useTransition } from "react";
import { updateAlarmSettings } from "@/app/actions/preferences";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { startAlarmSound } from "@/lib/alarm-sound";
import type { DictKey } from "@/lib/i18n";
import { Switch } from "./ReminderList";

const TONES = ["beru", "soft", "classic"] as const;
const SNOOZES = [5, 10, 15, 20, 30];

export function AlarmSettings({ tone, snooze, vibrate }: { tone: string; snooze: number; vibrate: boolean }) {
  const { t } = useI18n();
  const [, start] = useTransition();
  const [state, setState] = useState({ tone, snooze, vibrate });
  const stopRef = useRef<(() => void) | null>(null);

  const save = (patch: Partial<typeof state>) => {
    setState((s) => ({ ...s, ...patch }));
    start(() =>
      updateAlarmSettings({
        alarm_tone: patch.tone,
        alarm_snooze_min: patch.snooze,
        alarm_vibrate: patch.vibrate,
      }),
    );
  };

  const preview = async (next: string) => {
    stopRef.current?.();
    try {
      const stop = await startAlarmSound(next, false);
      stopRef.current = stop;
      window.setTimeout(() => {
        stop();
        if (stopRef.current === stop) stopRef.current = null;
      }, 1800);
    } catch {
      // audio unavailable
    }
  };

  const cycle = <T,>(list: readonly T[], cur: T) => list[(list.indexOf(cur) + 1) % list.length];

  return (
    <div className="flex flex-col rounded-[22px] border border-line bg-card">
      <button
        type="button"
        onClick={() => {
          const next = cycle(TONES, state.tone as (typeof TONES)[number]);
          save({ tone: next });
          void preview(next);
        }}
        className="flex min-h-14 items-center gap-2.5 px-4 text-left"
      >
        <span className="flex-1 text-sm font-bold">{t("rem.tone")}</span>
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
          <Icon name="sound" size={16} strokeWidth={2} />
          {t(`rem.tone.${state.tone}` as DictKey)}
        </span>
        <Icon name="chevron" size={18} className="text-muted" />
      </button>
      <div className="mx-4 h-px bg-line" />
      <button type="button" onClick={() => save({ snooze: cycle(SNOOZES, state.snooze) })} className="flex min-h-14 items-center gap-2.5 px-4 text-left">
        <span className="flex-1 text-sm font-bold">{t("rem.snooze")}</span>
        <span className="text-[13px] font-semibold text-muted">{t("common.minutes", { n: state.snooze })}</span>
        <Icon name="chevron" size={18} className="text-muted" />
      </button>
      <div className="mx-4 h-px bg-line" />
      <div className="flex min-h-14 items-center gap-2.5 px-4">
        <span className="flex-1 text-sm font-bold">{t("rem.vibrate")}</span>
        <Switch on={state.vibrate} label={t("rem.vibrate")} onToggle={() => save({ vibrate: !state.vibrate })} />
      </div>
    </div>
  );
}
