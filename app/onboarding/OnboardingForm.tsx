"use client";

import { useActionState, useRef, useState } from "react";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Beru } from "@/components/Beru";
import { useI18n } from "@/components/I18nProvider";
import { Icon } from "@/components/Icon";
import { btn, cn, input, label } from "@/components/ui";
import type { Locale, Role } from "@/lib/types";

export function OnboardingForm({
  defaultName,
  defaultRole,
  next,
  locale: initialLocale,
}: {
  defaultName: string;
  defaultRole?: Role;
  next?: string;
  locale: Locale;
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(completeOnboarding, undefined);
  const [member, setMember] = useState(defaultRole !== "coach");
  const [coach, setCoach] = useState(defaultRole === "coach");
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const tzRef = useRef<HTMLInputElement>(null);

  const roleCard = (on: boolean, toggle: () => void, title: string, desc: string, pose: "eat" | "lift", name: string) => (
    <label
      className={cn(
        "relative flex cursor-pointer items-center gap-3 rounded-[24px] border-2 p-3 pr-4 transition",
        on ? "border-grape bg-grape-s" : "border-line bg-card",
      )}
    >
      <input type="checkbox" name={name} checked={on} onChange={toggle} className="sr-only" />
      <Beru pose={pose} size={72} />
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="font-display text-lg font-semibold">{title}</span>
        <span className="text-[13px] leading-snug text-muted">{desc}</span>
      </span>
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
          on ? "border-grape bg-grape text-on-grape" : "border-line",
        )}
      >
        {on && <Icon name="check" size={16} strokeWidth={3.2} />}
      </span>
    </label>
  );

  return (
    <form
      action={action}
      onSubmit={() => {
        if (tzRef.current) tzRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }}
      className="flex flex-col gap-6"
    >
      <div className="flex items-center gap-2 rounded-[28px] bg-sun-s py-3.5 pr-4 pl-2">
        <Beru pose="wave" size={96} />
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl leading-tight font-semibold">{t("onb.title")}</h1>
          <p className="text-[13px] leading-snug text-muted">{t("onb.subtitle")}</p>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-1 font-display text-[19px] font-semibold">{t("onb.roleQ")}</legend>
        {roleCard(member, () => setMember((v) => !v), t("onb.roleMember"), t("onb.roleMemberDesc"), "eat", "is_member")}
        {roleCard(coach, () => setCoach((v) => !v), t("onb.roleCoach"), t("onb.roleCoachDesc"), "lift", "is_coach")}
        <p className="text-xs font-semibold text-muted">{t("onb.roleHint")}</p>
        {defaultRole && <input type="hidden" name="preferred" value={defaultRole} />}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="full_name" className={label}>
          {t("onb.name")}
        </label>
        <input id="full_name" name="full_name" required maxLength={80} defaultValue={defaultName} className={input} />
      </div>

      {coach && (
        <div className="flex flex-col gap-2">
          <label htmlFor="coach_bio" className={label}>
            {t("onb.coachBio")} <span className="font-medium text-muted">({t("common.optional")})</span>
          </label>
          <textarea id="coach_bio" name="coach_bio" rows={2} maxLength={240} placeholder={t("onb.coachBioPh")} className={cn(input, "resize-none")} />
        </div>
      )}

      {member && (
        <>
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-1 font-display text-[19px] font-semibold">{t("onb.body")}</legend>
            <div className="grid grid-cols-3 gap-2">
              <NumberField name="weight_kg" label={t("onb.weight")} step="0.1" />
              <NumberField name="height_cm" label={t("onb.height")} />
              <NumberField name="target_weight_kg" label={t("onb.targetWeight")} step="0.1" />
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-1 font-display text-[19px] font-semibold">{t("onb.dailyTargets")}</legend>
            <div className="grid grid-cols-3 gap-2">
              <NumberField name="kcal" label={t("onb.kcal")} defaultValue={2000} />
              <NumberField name="water_glasses" label={t("onb.water")} defaultValue={8} />
              <NumberField name="workout_min" label={t("onb.workout")} defaultValue={40} />
            </div>
          </fieldset>
        </>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className={cn(label, "mb-1")}>{t("onb.language")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["id", "en"] as const).map((l) => (
            <label
              key={l}
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border-[1.5px] text-sm font-bold",
                locale === l ? "border-grape bg-grape text-on-grape" : "border-line bg-card",
              )}
            >
              <input type="radio" name="locale" value={l} checked={locale === l} onChange={() => setLocale(l)} className="sr-only" />
              {l === "id" ? "Bahasa Indonesia" : "English"}
            </label>
          ))}
        </div>
      </fieldset>

      <input type="hidden" name="timezone" ref={tzRef} defaultValue="Asia/Jakarta" />
      {next && <input type="hidden" name="next" value={next} />}

      {state?.error && (
        <p role="alert" className="rounded-2xl bg-berry-s px-4 py-3 text-sm font-semibold text-berry-d">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending || (!member && !coach)} className={btn.primary}>
        {pending ? t("common.saving") : t("onb.submit")}
      </button>
    </form>
  );
}

function NumberField({ name, label: text, step, defaultValue }: { name: string; label: string; step?: string; defaultValue?: number }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="min-h-8 text-xs leading-tight font-bold text-muted">{text}</span>
      <input name={name} type="number" inputMode="decimal" step={step ?? "1"} defaultValue={defaultValue} className={cn(input, "px-3 text-center")} />
    </label>
  );
}
