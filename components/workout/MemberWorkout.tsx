"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleItemDone } from "@/app/actions/workout";
import { CATEGORY_ICON, Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { CATEGORY_TILE, cn } from "@/components/ui";
import { exerciseMeta, exerciseName, itemMinutes } from "@/lib/format";
import type { DictKey } from "@/lib/i18n";
import type { Exercise, WorkoutItem } from "@/lib/types";
import { AddWorkoutSheet, EditItemSheet } from "./AddWorkoutSheet";
import { TutorialButton } from "./TutorialButton";
import { WorkoutTimer } from "./WorkoutTimer";

/**
 * Member's day: "Tambah manual" first, then the coach option (`askCoach`), then the
 * plan with start / done toggles. Tapping a planned item edits its dose.
 */
export function MemberWorkout({
  memberId,
  date,
  catalog,
  items,
  askCoach,
}: {
  memberId: string;
  date: string;
  catalog: Exercise[];
  items: WorkoutItem[];
  askCoach?: React.ReactNode;
}) {
  const { t, locale } = useI18n();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<WorkoutItem | null>(null);
  const [timing, setTiming] = useState<WorkoutItem | null>(null);
  const [, start] = useTransition();

  const [doneIds, setDone] = useOptimistic(
    new Set(items.filter((i) => i.done_at).map((i) => i.id)),
    (state, { id, done }: { id: string; done: boolean }) => {
      const next = new Set(state);
      if (done) next.add(id);
      else next.delete(id);
      return next;
    },
  );

  const doneCount = items.filter((i) => doneIds.has(i.id)).length;
  const exerciseOf = (id: string | null) => catalog.find((x) => x.id === id) ?? null;

  const markDone = (id: string, done: boolean) =>
    start(async () => {
      setDone({ id, done });
      await toggleItemDone(id, done);
    });

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex items-center gap-3 rounded-[24px] bg-grape p-3.5 text-left text-on-grape shadow-float transition active:scale-[0.99]"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <Icon name="plus" size={26} strokeWidth={2.6} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-display text-lg leading-tight font-semibold">{t("workout.addManual")}</span>
          <span className="text-xs font-medium opacity-85">{t("workout.addManualBody")}</span>
        </span>
        <Icon name="chevron" size={20} className="shrink-0" />
      </button>

      {askCoach}

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-[19px] font-semibold">{t("workout.plan")}</h2>
          {items.length > 0 && (
            <span className="text-xs font-extrabold text-grape-d">
              {t("workout.progress", { a: doneCount, b: items.length })} · {t("workout.itemEstimate", { m: itemMinutes(items) })}
            </span>
          )}
        </div>

        {items.length === 0 && (
          <p className="rounded-[22px] border-2 border-dashed border-line px-4 py-6 text-center text-sm text-muted">{t("workout.emptyPlan")}</p>
        )}

        {items.map((it) => {
          const done = doneIds.has(it.id);
          const video = exerciseOf(it.exercise_id)?.video_url;
          const name = exerciseName(it, locale);
          return (
            <div
              key={it.id}
              className={cn(
                "flex w-full items-center gap-3 rounded-[22px] border-2 p-3 transition",
                done ? "border-mint bg-mint-s" : "border-line bg-card",
              )}
            >
              <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", CATEGORY_TILE[it.category])}>
                <Icon name={CATEGORY_ICON[it.category]} size={22} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(it)}
                  aria-label={`${t("workout.editDose")}: ${name}`}
                  className="flex min-w-0 flex-col items-start gap-1 text-left"
                >
                  <span className={cn("text-[15px] font-bold", done && "line-through decoration-2 opacity-70")}>{name}</span>
                  <span className="flex items-center gap-1 text-xs font-medium text-muted">
                    {t(`cat.${it.category}` as DictKey)} · {exerciseMeta(it, t)}
                    <Icon name="edit" size={13} />
                  </span>
                </button>
                {video && <TutorialButton url={video} title={name} />}
              </span>
              {!done && (
                <button
                  type="button"
                  onClick={() => setTiming(it)}
                  aria-label={`${t("workout.start")}: ${name}`}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-grape px-3.5 text-[13px] font-extrabold text-on-grape transition active:scale-95"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
                  </svg>
                  {t("workout.start")}
                </button>
              )}
              <button
                type="button"
                aria-pressed={done}
                aria-label={`${t("workout.markDone")}: ${name}`}
                onClick={() => markDone(it.id, !done)}
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90",
                  done ? "border-mint bg-mint text-ink" : "border-line text-muted",
                )}
              >
                <Icon name="check" size={18} strokeWidth={3} />
              </button>
            </div>
          );
        })}
      </section>

      <AddWorkoutSheet open={adding} onClose={() => setAdding(false)} memberId={memberId} date={date} catalog={catalog} />
      <EditItemSheet item={editing} base={editing ? exerciseOf(editing.exercise_id) : null} onClose={() => setEditing(null)} />

      {timing && (
        <WorkoutTimer
          item={timing}
          videoUrl={exerciseOf(timing.exercise_id)?.video_url}
          onClose={() => setTiming(null)}
          onDone={() => {
            markDone(timing.id, true);
            setTiming(null);
          }}
        />
      )}
    </div>
  );
}
