"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleExercise } from "@/app/actions/workout";
import { CATEGORY_ICON, Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { CATEGORY_TILE, cn } from "@/components/ui";
import { TutorialButton } from "./TutorialButton";
import { CATEGORIES, exerciseMeta, exerciseName } from "@/lib/format";
import type { DictKey } from "@/lib/i18n";
import type { Exercise, ExerciseCategory, WorkoutItem } from "@/lib/types";

type Filter = "all" | ExerciseCategory;

/**
 * Coach's exercise picker (design: 05 · Pilih Latihan). Selecting an exercise adds it
 * to the member's plan for the day; selecting it again removes it.
 */
export function WorkoutPicker({
  memberId,
  date,
  catalog,
  items,
}: {
  memberId: string;
  date: string;
  catalog: Exercise[];
  items: WorkoutItem[];
}) {
  const { t, locale } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");
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

  const visible = catalog.filter((x) => filter === "all" || x.category === filter);
  const chosen = catalog.filter((x) => selected.has(x.id));
  const minutes = chosen.reduce((a, x) => a + x.minutes, 0);

  return (
    <div className="flex flex-col gap-4">
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
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", CATEGORY_TILE[x.category])}>
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
      </div>
    </div>
  );
}
