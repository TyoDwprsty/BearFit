"use client";

import { useState, useTransition } from "react";
import { publishPlan } from "@/app/actions/workout";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { btn, cn, input } from "@/components/ui";

/** Coach: note for the member + "save & notify". */
export function PublishPlan({ memberId, date, note }: { memberId: string; date: string; note: string }) {
  const { t } = useI18n();
  const [value, setValue] = useState(note);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2 rounded-[22px] border border-line bg-card p-3.5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">{t("coach.planNote")}</span>
        <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={2} maxLength={500} className={cn(input, "resize-none")} />
      </label>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await publishPlan(memberId, date, value);
            setDone(!!res?.ok);
          })
        }
        className={cn(btn.primary, "h-12 text-base")}
      >
        <Icon name={done ? "check" : "send"} size={18} />
        {pending ? t("common.saving") : t("coach.planSave")}
      </button>
      {done && <p className="text-sm font-bold text-mint-d">{t("coach.planSaved")}</p>}
    </div>
  );
}
