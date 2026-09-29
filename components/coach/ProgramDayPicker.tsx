"use client";

import { useOptimistic, useTransition } from "react";
import { toggleProgramExercise } from "@/app/actions/coach";
import { CATEGORY_ICON, Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { CATEGORY_TILE, cn } from "@/components/ui";
import { exerciseMeta, exerciseName } from "@/lib/format";
import type { DictKey } from "@/lib/i18n";
import type { Exercise } from "@/lib/types";


export function ProgramDayPicker({ programId, day, catalog, selectedIds }: { programId: string; day: number; catalog: Exercise[]; selectedIds: string[] }) {
  const { t, locale } = useI18n();
  const [, start] = useTransition();
  const [selected, toggle] = useOptimistic(new Set(selectedIds), (state, id: string) => {
    const next = new Set(state);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const minutes = catalog.filter((x) => selected.has(x.id)).reduce((a, x) => a + x.minutes, 0);

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-bold text-grape-d">
        {t("workout.selected", { n: selected.size })} · {t("workout.estimate", { m: minutes })}
      </p>
      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
        {catalog.map((x) => {
          const on = selected.has(x.id);
          return (
            <button
              key={x.id}
              type="button"
              aria-pressed={on}
              onClick={() =>
                start(async () => {
                  toggle(x.id);
                  await toggleProgramExercise(programId, day, x.id);
                })
              }
              className={cn(
                "flex w-full items-center gap-3 rounded-[22px] border-2 p-3 text-left transition",
                on ? "border-grape bg-grape-s" : "border-line bg-card",
              )}
            >
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", CATEGORY_TILE[x.category])}>
                <Icon name={CATEGORY_ICON[x.category]} size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-bold">{exerciseName(x, locale)}</span>
                <span className="text-xs text-muted">
                  {t(`cat.${x.category}` as DictKey)} · {exerciseMeta(x, t)}
                </span>
              </span>
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2", on ? "border-grape bg-grape text-on-grape" : "border-line")}>
                {on && <Icon name="check" size={16} strokeWidth={3.2} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
