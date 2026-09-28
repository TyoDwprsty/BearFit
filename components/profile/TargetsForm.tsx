"use client";

import { useActionState } from "react";
import { saveTargets } from "@/app/actions/tracking";
import { useI18n } from "@/components/I18nProvider";
import { btn, cn, input } from "@/components/ui";
import type { Targets } from "@/lib/types";
import { useProgress } from "@/components/feedback/NavigationProgress";
import { Alert } from "@/components/feedback/Alert";

/** Daily targets editor — used by the member (profile) and by the coach (member detail). */
export function TargetsForm({ targets, userId }: { targets: Targets; userId?: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(saveTargets, undefined);
  useProgress(pending);

  const fields: { name: keyof Targets; label: string; step?: string }[] = [
    { name: "kcal", label: t("onb.kcal") },
    { name: "protein_g", label: `${t("macro.protein")} (g)` },
    { name: "carbs_g", label: `${t("macro.carbs")} (g)` },
    { name: "fat_g", label: `${t("macro.fat")} (g)` },
    { name: "workout_min", label: t("onb.workout") },
    { name: "water_glasses", label: t("onb.water") },
    { name: "meals", label: t("home.ringMeals") },
    { name: "target_weight_kg", label: t("onb.targetWeight"), step: "0.1" },
  ];

  return (
    <form action={action} className="flex flex-col gap-3">
      {userId && <input type="hidden" name="user_id" value={userId} />}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {fields.map((f) => (
          <label key={f.name} className="flex flex-col gap-1">
            <span className="min-h-8 text-[11px] leading-tight font-bold text-muted">{f.label}</span>
            <input
              name={f.name}
              type="number"
              inputMode="decimal"
              step={f.step ?? "1"}
              defaultValue={targets[f.name] ?? ""}
              required={f.name !== "target_weight_kg"}
              className={cn(input, "px-3 text-center font-bold")}
            />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} aria-busy={pending} className={cn(btn.primary, "h-12 text-base")}>
          {pending ? t("common.saving") : t("common.save")}
        </button>
        {state?.ok && <span className="text-sm font-bold text-mint-d">✓ {t("common.saved")}</span>}
      </div>
      {state?.error && <Alert>{t("common.error")}</Alert>}
    </form>
  );
}
