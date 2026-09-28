"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { toggleExercise, toggleItemDone } from "@/app/actions/workout";
import { CATEGORY_ICON, Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { cn, SOLID } from "@/components/ui";
import { TutorialButton } from "./TutorialButton";
import { WorkoutTimer } from "./WorkoutTimer";
import { CATEGORIES, exerciseMeta, exerciseName } from "@/lib/format";
import type { DictKey } from "@/lib/i18n";
import type { Exercise, ExerciseCategory, WorkoutItem } from "@/lib/types";

const TILE: Record<ExerciseCategory, string> = { cardio: SOLID.mango, strength: SOLID.grape, flexibility: SOLID.mint };

type Filter = "all" | ExerciseCategory;

/**
 * Exercise picker (design: 05 · Pilih Latihan). Selecting an exercise adds it to
 * the day's plan; members can tick planned items as done.
 */
export function WorkoutPicker({
  memberId,
  date,
  catalog,
  items,
  mode,
  footer,
}: {
  memberId: string;
  date: string;
  catalog: Exercise[];
  items: WorkoutItem[];
  mode: "member" | "coach";
  footer?: React.ReactNode;
}) {
  const { t, locale } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");
  const [timing, setTiming] = useState<WorkoutItem | null>(null);
  const [, start] = useTransition();

  const [selected, toggleSelected] = useOptimistic(
    new Set(items.map((i) => i.exercise_id).filter(Boolean) as string[]),
    (state, id: string) => {
      const next = new Set(state);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    },
  );
  const [doneIds, setDone] = useOptimistic(
    new Set(items.filter((i) => i.done_at).map((i) => i.id)),
    (state, { id, done }: { id: string; done: boolean }) => {
      const next = new Set(state);
      if (done) next.add(id);
      else next.delete(id);
      return next;
    },
  );

  const visible = catalog.filter((x) => filter === "all" || x.category === filter);
  const chosen = catalog.filter((x) => selected.has(x.id));
  const minutes = chosen.reduce((a, x) => a + x.minutes, 0);
  const doneCount = items.filter((i) => doneIds.has(i.id)).length;
  const videoOf = (exerciseId: string | null) => catalog.find((x) => x.id === exerciseId)?.video_url ?? null;

  const markDone = (id: string, done: boolean) =>
    start(async () => {
      setDone({ id, done });
      await toggleItemDone(id, done);
    });

  return (
    <div className="flex flex-col gap-4">
      {/* Planned items with done toggles */}
      {mode === "member" && items.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[19px] font-semibold">{t("workout.plan")}</h2>
            <span className="text-xs font-extrabold text-grape-d">{t("workout.progress", { a: doneCount, b: items.length })}</span>
          </div>
          {items.map((it) => {
            const done = doneIds.has(it.id);
            const video = videoOf(it.exercise_id);
            return (
              <div
                key={it.id}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[22px] border-2 p-3 transition",
                  done ? "border-mint bg-mint-s" : "border-line bg-card",
                )}
              >
                <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", TILE[it.category])}>
                  <Icon name={CATEGORY_ICON[it.category]} size={22} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={cn("text-[15px] font-bold", done && "line-through decoration-2 opacity-70")}>{exerciseName(it, locale)}</span>
                  <span className="text-xs font-medium text-muted">
                    {t(`cat.${it.category}` as DictKey)} · {exerciseMeta(it, t)}
                  </span>
                  {video && <TutorialButton url={video} title={exerciseName(it, locale)} className="self-start" />}
                </span>
                {!done && (
                  <button
                    type="button"
                    onClick={() => setTiming(it)}
                    aria-label={`${t("workout.start")}: ${exerciseName(it, locale)}`}
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
                  aria-label={`${t("workout.markDone")}: ${exerciseName(it, locale)}`}
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
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[19px] font-semibold">{t("workout.catalog")}</h2>
        <div className="flex flex-wrap gap-2">
          {(["all", ...CATEGORIES] as Filter[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
              className={cn(
                "min-h-11 rounded-full border-[1.5px] px-4 text-[13px] font-bold transition",
                filter === c ? "border-grape bg-grape text-on-grape" : "border-line bg-card text-text",
              )}
            >
              {t(`cat.${c}` as DictKey)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {visible.map((x) => {
            const on = selected.has(x.id);
            return (
              <div key={x.id} className={cn("rounded-[22px] border-2 transition", on ? "border-grape bg-grape-s" : "border-line bg-card")}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    start(async () => {
                      toggleSelected(x.id);
                      await toggleExercise(memberId, date, x.id);
                    })
                  }
                  className="flex w-full items-center gap-3 p-3 text-left transition active:scale-[0.99]"
                >
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", TILE[x.category])}>
                    <Icon name={CATEGORY_ICON[x.category]} size={22} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="text-[15px] font-bold">{exerciseName(x, locale)}</span>
                    <span className="text-xs font-medium text-muted">
                      {t(`cat.${x.category}` as DictKey)} · {exerciseMeta(x, t)} · {t(`int.${x.intensity}` as DictKey)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                      on ? "border-grape bg-grape text-on-grape" : "border-line",
                    )}
                  >
                    {on && <Icon name="check" size={16} strokeWidth={3.2} />}
                  </span>
                </button>
                {x.video_url && (
                  <div className="-mt-1.5 pb-3 pl-[72px]">
                    <TutorialButton url={x.video_url} title={exerciseName(x, locale)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Sticky summary bar */}
      <div className="sticky bottom-[100px] z-20 mt-2 flex items-center gap-3 rounded-[22px] bg-text py-3 pr-3 pl-[18px] text-bg shadow-float lg:bottom-6">
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-extrabold">{t("workout.selected", { n: chosen.length })}</span>
          <span className="text-xs font-medium">{t("workout.estimate", { m: minutes })}</span>
        </div>
        {footer ??
          (mode === "member" && (
            <Link href="/reminders" className="flex min-h-[46px] items-center rounded-[14px] bg-mango px-4 text-[13px] font-extrabold text-ink">
              {t("workout.saveReminder")}
            </Link>
          ))}
      </div>

      {timing && (
        <WorkoutTimer
          item={timing}
          videoUrl={videoOf(timing.exercise_id)}
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
