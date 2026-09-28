"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { cn, input } from "@/components/ui";

/** Program length in weeks, or "repeat every week" (submitted as `repeat=on`, no `weeks`). */
export function ProgramLengthField({ defaultWeeks }: { defaultWeeks: number | null }) {
  const { t } = useI18n();
  const [repeat, setRepeat] = useState(defaultWeeks == null);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">{t("programs.weeks")}</span>
        <input
          name="weeks"
          type="number"
          min={1}
          max={52}
          defaultValue={defaultWeeks ?? 8}
          required={!repeat}
          disabled={repeat}
          className={cn(input, "disabled:opacity-50")}
        />
      </label>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[18px] bg-grape-s px-4 py-2.5">
        <input
          type="checkbox"
          name="repeat"
          checked={repeat}
          onChange={(e) => setRepeat(e.target.checked)}
          className="h-5 w-5 shrink-0 accent-[var(--grape)]"
        />
        <span className="flex flex-col">
          <span className="text-sm font-bold text-grape-d">{t("programs.repeat")}</span>
          <span className="text-xs text-muted">{t("programs.repeatBody")}</span>
        </span>
      </label>
    </div>
  );
}
