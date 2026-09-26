"use client";

import { useActionState, useEffect, useRef } from "react";
import { logWeight } from "@/app/actions/tracking";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";

export function WeightForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(logWeight, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="flex items-center gap-2">
      <input
        name="weight_kg"
        type="number"
        inputMode="decimal"
        step="0.1"
        min={20}
        max={400}
        required
        placeholder={t("progress.weightPh")}
        aria-label={t("progress.weightPh")}
        aria-invalid={!!state?.error}
        className="h-11 min-w-0 flex-1 rounded-2xl border-[1.5px] border-line bg-card px-3.5 text-base focus:border-mint focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-mint px-4 text-[13px] font-extrabold text-ink transition active:scale-95 disabled:opacity-60"
      >
        <Icon name="plus" size={16} strokeWidth={2.6} />
        {t("progress.logWeight")}
      </button>
    </form>
  );
}
