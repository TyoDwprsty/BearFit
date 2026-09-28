"use client";

import { useOptimistic, useState, useTransition } from "react";
import { deleteReminder, saveReminder, toggleReminder } from "@/app/actions/reminders";
import { Icon, REMINDER_ICON } from "@/components/Icon";
import { useConfirm, useToast } from "@/components/feedback/FeedbackProvider";
import { useI18n } from "@/components/I18nProvider";
import { Sheet } from "@/components/Sheet";
import { btn, cn, input, label, SOLID } from "@/components/ui";
import { hhmm } from "@/lib/dates";
import { reminderDays } from "@/lib/format";
import type { DictKey } from "@/lib/i18n";
import type { Reminder, ReminderKind } from "@/lib/types";
import { useProgress } from "@/components/feedback/NavigationProgress";
import { Alert } from "@/components/feedback/Alert";

const KIND_COLOR: Record<ReminderKind, string> = {
  stretch: SOLID.mint,
  water: SOLID.sky,
  meal: SOLID.mango,
  workout: SOLID.grape,
  recap: SOLID.berry,
  custom: SOLID.sun,
};
const KINDS: ReminderKind[] = ["workout", "water", "meal", "stretch", "recap", "custom"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function Switch({ on, onToggle, label: aria, disabled }: { on: boolean; onToggle: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={aria}
      disabled={disabled}
      onClick={onToggle}
      className={cn("relative h-8 w-[54px] shrink-0 rounded-2xl transition disabled:opacity-50", on ? "bg-grape" : "bg-line")}
    >
      <span className={cn("absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all", on ? "left-[26px]" : "left-1")} />
    </button>
  );
}

export function ReminderList({ reminders, userId }: { reminders: Reminder[]; userId?: string }) {
  const { t } = useI18n();
  const [, start] = useTransition();
  const [enabled, setEnabled] = useOptimistic(
    Object.fromEntries(reminders.map((r) => [r.id, r.enabled])) as Record<string, boolean>,
    (state, { id, on }: { id: string; on: boolean }) => ({ ...state, [id]: on }),
  );
  const [editing, setEditing] = useState<Reminder | "new" | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {reminders.map((r) => {
          const on = enabled[r.id];
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-[22px] border border-line bg-card px-3.5 py-3">
              <button type="button" onClick={() => setEditing(r)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${t("rem.edit")}: ${r.label}`}>
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] transition", on ? KIND_COLOR[r.kind] : "bg-soft text-muted")}>
                  <Icon name={REMINDER_ICON[r.kind]} size={20} />
                </span>
                <span className={cn("flex min-w-0 flex-1 flex-col gap-px", !on && "text-muted")}>
                  <span className="font-display text-[22px] leading-tight font-semibold">{hhmm(r.remind_time)}</span>
                  <span className="truncate text-[13px] font-bold">{r.label}</span>
                  <span className="truncate text-xs font-medium text-muted">{reminderDays(r, t)}</span>
                </span>
              </button>
              <Switch
                on={on}
                label={t("rem.toggle", { label: r.label })}
                onToggle={() =>
                  start(async () => {
                    setEnabled({ id: r.id, on: !on });
                    await toggleReminder(r.id, !on);
                  })
                }
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setEditing("new")}
        className="flex min-h-14 items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-line text-sm font-extrabold text-grape-d transition active:scale-[0.99]"
      >
        <Icon name="plus" size={18} strokeWidth={2.6} />
        {t("rem.add")}
      </button>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? t("rem.add") : t("rem.edit")}>
        {editing !== null && <ReminderEditor reminder={editing === "new" ? null : editing} userId={userId} onDone={() => setEditing(null)} />}
      </Sheet>
    </>
  );
}

function ReminderEditor({ reminder, userId, onDone }: { reminder: Reminder | null; userId?: string; onDone: () => void }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const toast = useToast();
  const [pending, start] = useTransition();
  useProgress(pending);
  const [kind, setKind] = useState<ReminderKind>(reminder?.kind ?? "workout");
  const [labelText, setLabel] = useState(reminder?.label ?? "");
  const [time, setTime] = useState(reminder ? hhmm(reminder.remind_time) : "07:00");
  const [days, setDays] = useState<Set<number>>(new Set(reminder?.days ?? [0, 1, 2, 3, 4, 5, 6]));
  const [every, setEvery] = useState<number | null>(reminder?.repeat_every_min ?? null);
  const [until, setUntil] = useState(reminder?.repeat_until ? hhmm(reminder.repeat_until) : "20:00");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await saveReminder({
            id: reminder?.id,
            user_id: userId,
            label: labelText.trim() || t(`rem.kind.${kind}` as DictKey),
            kind,
            remind_time: time,
            days: [...days],
            repeat_every_min: every,
            repeat_until: every ? until : null,
          });
          if (res?.error) setError(t("common.error"));
          else {
            toast(t("common.saved"));
            onDone();
          }
        });
      }}
    >
      <div className="flex items-center justify-center rounded-[24px] bg-sun-s py-3">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          aria-label={t("rem.time")}
          className="bg-transparent text-center font-display text-[56px] leading-none font-semibold focus:outline-none"
        />
      </div>

      <label className="flex flex-col gap-2">
        <span className={label}>{t("rem.label")}</span>
        <input value={labelText} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder={t(`rem.kind.${kind}` as DictKey)} className={input} />
      </label>

      <div className="flex flex-col gap-2">
        <span className={label}>{t("rem.kind")}</span>
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border-[1.5px] text-[13px] font-bold",
                kind === k ? "border-grape bg-grape-s text-grape-d" : "border-line bg-card",
              )}
            >
              <Icon name={REMINDER_ICON[k]} size={16} />
              {t(`rem.kind.${k}` as DictKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>{t("rem.days")}</span>
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_ORDER.map((d) => {
            const on = days.has(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setDays((prev) => {
                    const next = new Set(prev);
                    if (on && next.size > 1) next.delete(d);
                    else next.add(d);
                    return next;
                  })
                }
                className={cn("h-11 rounded-2xl border-[1.5px] text-xs font-extrabold", on ? "border-grape bg-grape text-on-grape" : "border-line bg-card text-muted")}
              >
                {t(`weekday.${d}` as DictKey)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-2">
          <span className={label}>{t("rem.repeat")}</span>
          <select value={every ?? ""} onChange={(e) => setEvery(e.target.value ? Number(e.target.value) : null)} className={input}>
            <option value="">{t("rem.repeatNone")}</option>
            {[30, 60, 90, 120, 180, 240].map((m) => (
              <option key={m} value={m}>
                {m % 60 === 0 ? `${m / 60} ${t("common.hourShort")}` : `${m} ${t("common.minShort")}`}
              </option>
            ))}
          </select>
        </label>
        <label className={cn("flex flex-col gap-2", !every && "opacity-50")}>
          <span className={label}>{t("rem.repeatUntil")}</span>
          <input type="time" value={until} disabled={!every} onChange={(e) => setUntil(e.target.value)} className={input} />
        </label>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="flex gap-2">
        {reminder && (
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              const ok = await confirm({ title: t("rem.deleteConfirm", { label: reminder.label }), confirmLabel: t("common.delete"), danger: true, pose: "alarm" });
              if (!ok) return;
              start(async () => {
                await deleteReminder(reminder.id);
                toast(t("common.deleted"));
                onDone();
              });
            }}
            className={cn(btn.outline, "w-14 px-0 text-berry-d")}
            aria-label={t("common.delete")}
          >
            <Icon name="trash" size={20} />
          </button>
        )}
        <button type="submit" disabled={pending} aria-busy={pending} className={cn(btn.primary, "flex-1")}>
          {pending ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </form>
  );
}
