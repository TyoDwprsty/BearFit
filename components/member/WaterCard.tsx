"use client";

import { useOptimistic, useTransition } from "react";
import { changeWater } from "@/app/actions/tracking";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/components/ui";

export function WaterCard({ glasses, target }: { glasses: number; target: number }) {
  const { t } = useI18n();
  const [optimistic, setOptimistic] = useOptimistic(glasses);
  const [, start] = useTransition();
  const segments = Math.max(target, optimistic);

  const change = (delta: 1 | -1) =>
    start(async () => {
      setOptimistic(Math.max(0, optimistic + delta));
      await changeWater(delta);
    });

  return (
    <div className="flex items-center gap-3.5 rounded-[24px] bg-sky-s px-4 py-3.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-sky text-ink">
        <Icon name="water" size={20} strokeWidth={2} />
      </span>
      <div className="flex flex-1 flex-col gap-2">
        <span className="text-sm font-bold">{t("home.water", { a: optimistic, b: target })}</span>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}>
          {Array.from({ length: segments }, (_, i) => (
            <span key={i} className={cn("h-2.5 rounded-[5px] transition-colors", i < optimistic ? "bg-sky" : "bg-card")} />
          ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          aria-label={t("home.addGlass")}
          onClick={() => change(1)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-sky-d transition active:scale-90"
        >
          <Icon name="plus" size={20} strokeWidth={2.5} />
        </button>
        {optimistic > 0 && (
          <button
            type="button"
            aria-label={t("home.removeGlass")}
            onClick={() => change(-1)}
            className="flex h-7 w-11 items-center justify-center rounded-full text-sky-d/80 transition active:scale-90"
          >
            <Icon name="minus" size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}
