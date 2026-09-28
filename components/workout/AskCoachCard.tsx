"use client";

import { useTransition } from "react";
import { cancelWorkoutRequest, requestWorkoutFromCoach } from "@/app/actions/workout";
import { Beru } from "@/components/Beru";
import { useProgress } from "@/components/feedback/NavigationProgress";
import { useToast } from "@/components/feedback/FeedbackProvider";
import { useI18n } from "@/components/I18nProvider";
import { btn, cn } from "@/components/ui";

/** Member: let the coach put the day's workout together instead of picking it yourself. */
export function AskCoachCard({ date, coachName, requested }: { date: string; coachName: string; requested: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const [pending, start] = useTransition();
  useProgress(pending);

  if (requested) {
    return (
      <div className="flex items-center gap-3 rounded-[24px] border-2 border-dashed border-grape/40 bg-grape-s p-3.5">
        <span className="animate-beru shrink-0">
          <Beru pose="wave" size={56} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-bold text-grape-d">{t("workout.requested", { name: coachName })}</span>
          <span className="text-xs text-muted">{t("workout.requestedBody")}</span>
        </div>
        <button
          type="button"
          disabled={pending}
          aria-busy={pending}
          onClick={() => start(() => cancelWorkoutRequest(date))}
          className={cn(btn.ghost, "shrink-0 text-muted")}
        >
          {t("workout.cancelRequest")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-line bg-card p-3.5">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sun-s">
        <Beru pose="lift" size={50} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-bold">{t("workout.askCoach", { name: coachName })}</span>
        <span className="text-xs text-muted">{t("workout.askCoachBody")}</span>
      </div>
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          start(async () => {
            const res = await requestWorkoutFromCoach(date);
            if (res.ok) toast(t("workout.requestSent"));
            else toast(t("common.error"), "error");
          })
        }
        className={cn(btn.small, "shrink-0 bg-grape text-on-grape")}
      >
        {t("workout.ask")}
      </button>
    </div>
  );
}
