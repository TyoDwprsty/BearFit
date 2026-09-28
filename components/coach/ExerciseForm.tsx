"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { createExercise, deleteExercise } from "@/app/actions/coach";
import { Icon } from "@/components/Icon";
import { useConfirm } from "@/components/feedback/FeedbackProvider";
import { useI18n } from "@/components/I18nProvider";
import { btn, cn, input } from "@/components/ui";
import { CATEGORIES, INTENSITIES } from "@/lib/format";
import type { DictKey } from "@/lib/i18n";
import { useProgress } from "@/components/feedback/NavigationProgress";
import { Alert } from "@/components/feedback/Alert";

export function ExerciseForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(createExercise, undefined);
  useProgress(pending);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  const num = (name: string, text: string, def?: number) => (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-muted">{text}</span>
      <input name={name} type="number" min={1} defaultValue={def} className={cn(input, "px-2 text-center")} />
    </label>
  );

  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">{t("exercises.nameId")}</span>
        <input name="name_id" required maxLength={60} className={input} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">
          {t("exercises.nameEn")} <span className="font-medium text-muted">({t("common.optional")})</span>
        </span>
        <input name="name_en" maxLength={60} className={input} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">{t("exercises.category")}</span>
          <select name="category" className={input}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`cat.${c}` as DictKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">{t("exercises.intensity")}</span>
          <select name="intensity" className={input}>
            {INTENSITIES.map((c) => (
              <option key={c} value={c}>
                {t(`int.${c}` as DictKey)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">
          {t("exercises.video")} <span className="font-medium text-muted">({t("common.optional")})</span>
        </span>
        <input name="video_url" type="url" inputMode="url" placeholder="https://youtube.com/watch?v=…" pattern="https://.*" maxLength={500} className={input} />
        <span className="text-xs text-muted">{t("exercises.videoHint")}</span>
      </label>
      <div className="grid grid-cols-4 gap-2">
        {num("sets", t("exercises.sets"))}
        {num("reps", t("exercises.reps"))}
        {num("duration_sec", t("exercises.duration"))}
        {num("minutes", t("exercises.minutes"), 10)}
      </div>
      {state?.error && <Alert>{t("common.error")}</Alert>}
      {state?.ok && <Alert tone="success">{t("common.saved")}</Alert>}
      <button type="submit" disabled={pending} aria-busy={pending} className={cn(btn.primary, "h-12 text-base")}>
        <Icon name="plus" size={18} />
        {t("common.add")}
      </button>
    </form>
  );
}

export function DeleteExerciseButton({ id, name }: { id: string; name: string }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  useProgress(pending);
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={t("common.delete")}
      onClick={async () => {
        if (await confirm({ title: t("exercises.deleteConfirm", { name }), confirmLabel: t("common.delete"), danger: true, pose: "lift" })) {
          start(() => deleteExercise(id));
        }
      }}
      className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-soft"
    >
      <Icon name="trash" size={17} />
    </button>
  );
}
