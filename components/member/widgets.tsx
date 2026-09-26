import type { TFunction } from "@/lib/i18n";
import { ProgressBar } from "@/components/ui";

/** Three concentric progress rings (workout / meals / water) from the Home design. */
export function TargetRings({ workout, meals, water, size = 124 }: { workout: number; meals: number; water: number; size?: number }) {
  const ring = (r: number, frac: number, track: string, color: string) => {
    const c = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(1, frac)) * c;
    return (
      <>
        <circle cx="60" cy="60" r={r} fill="none" stroke={track} strokeWidth="12" />
        {v > 0 && (
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${v} ${c}`}
            transform="rotate(-90 60 60)"
          />
        )}
      </>
    );
  };
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden className="shrink-0">
      {ring(50, workout, "var(--grape-s)", "var(--grape)")}
      {ring(36, meals, "var(--mint-s)", "var(--mint)")}
      {ring(22, water, "var(--sky-s)", "var(--sky)")}
    </svg>
  );
}

export function NutritionSummary({
  totals,
  targets,
  t,
  compact,
}: {
  totals: { kcal: number; protein: number; carbs: number; fat: number };
  targets: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  t: TFunction;
  compact?: boolean;
}) {
  const macros = [
    { label: t("macro.protein"), v: totals.protein, max: targets.protein_g, bar: "bg-grape" },
    { label: t("macro.carbs"), v: totals.carbs, max: targets.carbs_g, bar: "bg-mango" },
    { label: t("macro.fat"), v: totals.fat, max: targets.fat_g, bar: "bg-berry" },
  ];
  const over = totals.kcal > targets.kcal;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-[26px] leading-none font-semibold">
          {Math.round(totals.kcal)}
          <span className="ml-1 text-sm font-bold text-muted">/ {targets.kcal} {t("common.kcal")}</span>
        </span>
        <span className={over ? "text-xs font-extrabold text-berry-d" : "text-xs font-extrabold text-mint-d"}>
          {Math.round((totals.kcal / Math.max(1, targets.kcal)) * 100)}%
        </span>
      </div>
      <ProgressBar value={totals.kcal} max={targets.kcal} barClass={over ? "bg-berry" : "bg-mint"} className="h-3" />
      <div className={compact ? "grid grid-cols-3 gap-3" : "grid grid-cols-3 gap-4"}>
        {macros.map((m) => (
          <div key={m.label} className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-muted">{m.label}</span>
            <ProgressBar value={m.v} max={m.max} barClass={m.bar} className="h-2" />
            <span className="text-xs font-bold">
              {Math.round(m.v)}
              <span className="font-semibold text-muted">/{m.max}g</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
