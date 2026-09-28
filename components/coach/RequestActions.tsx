"use client";

import { useTransition } from "react";
import { respondToRequest } from "@/app/actions/links";
import { useI18n } from "@/components/I18nProvider";
import { btn, cn } from "@/components/ui";
import { useProgress } from "@/components/feedback/NavigationProgress";

export function RequestActions({ linkId }: { linkId: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  useProgress(pending);
  return (
    <div className="flex shrink-0 gap-1.5">
      <button type="button" disabled={pending} onClick={() => start(() => respondToRequest(linkId, false).then(() => {}))} className={btn.ghost}>
        {t("common.reject")}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => respondToRequest(linkId, true).then(() => {}))}
        className={cn(btn.small, "bg-grape text-on-grape")}
      >
        {t("common.accept")}
      </button>
    </div>
  );
}
