"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMeal } from "@/app/actions/meals";
import { Beru } from "@/components/Beru";
import { FOOD_ART_BY_MEAL, FoodArt } from "@/components/FoodArt";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { btn, cn, input, label, optionClass } from "@/components/ui";
import { MEAL_TAGS, MEAL_TYPES, PORTIONS } from "@/lib/format";
import type { DictKey } from "@/lib/i18n";
import { blobToDataUrl, compressImage } from "@/lib/image-client";
import { usePhotoUpload } from "@/lib/use-photo-upload";
import type { MealType, NutritionEstimate, Portion } from "@/lib/types";

type Tag = (typeof MEAL_TAGS)[number];
type AiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; estimate: NutritionEstimate }
  | { status: "error"; reason: "fail" | "nokey" };

export function PostMealForm({
  defaultType,
  date,
  defaultTime,
  coachName,
  aiEnabled,
  uploadEnabled,
}: {
  defaultType: MealType;
  date: string;
  defaultTime: string;
  coachName: string | null;
  aiEnabled: boolean;
  uploadEnabled: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mealType, setMealType] = useState<MealType>(defaultType);
  const [portion, setPortion] = useState<Portion>("medium");
  const [tags, setTags] = useState<Set<Tag>>(new Set());
  const [caption, setCaption] = useState("");
  const [time, setTime] = useState(defaultTime);
  const [share, setShare] = useState(!!coachName);
  // Picked photo is compressed to WebP and staged in R2 right away (see usePhotoUpload).
  // `photo.original` feeds the AI as a sharp JPEG.
  const { photo, pick, retry, waitForKey } = usePhotoUpload({ enabled: uploadEnabled });
  const [macros, setMacros] = useState({ calories: "", protein_g: "", carbs_g: "", fat_g: "" });
  const [aiUsed, setAiUsed] = useState(false);
  const [ai, setAi] = useState<AiState>({ status: "idle" });
  const [phase, setPhase] = useState<"idle" | "uploading" | "posting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  async function estimate(original: File) {
    if (!aiEnabled) {
      setAi({ status: "error", reason: "nokey" });
      return;
    }
    setAi({ status: "loading" });
    try {
      // JPEG is the safest format for vision models; 1024px keeps food details readable.
      const small = await compressImage(original, { maxSide: 1024, quality: 0.85, type: "image/jpeg" });
      const res = await fetch("/api/ai/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: await blobToDataUrl(small), caption, portion }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const est = (await res.json()) as NutritionEstimate;
      // Not food / unreadable photo → Beru "can't see" it.
      if (!est.calories) {
        setAi({ status: "error", reason: "fail" });
        return;
      }
      setAi({ status: "done", estimate: est });
      setMacros({
        calories: String(est.calories),
        protein_g: String(est.protein_g),
        carbs_g: String(est.carbs_g),
        fat_g: String(est.fat_g),
      });
      setAiUsed(true);
      if (est.tags.length) setTags((prev) => new Set([...prev, ...(est.tags as Tag[])]));
      if (!caption && est.name) setCaption(est.name);
    } catch {
      setAi({ status: "error", reason: "fail" });
    }
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      await pick(file);
      void estimate(file);
    } catch {
      setError(t("common.error"));
    }
  }

  function submit(skipPhoto = false) {
    setError(null);
    start(async () => {
      let stagedKey: string | null = null;
      if (photo && !skipPhoto) {
        // Usually already finished in the background while the form was filled in.
        setPhase("uploading");
        stagedKey = await waitForKey();
        if (!stagedKey) {
          // Keep the form (and the photo) instead of silently posting without it.
          setError(t("post.uploadFail"));
          setPhase("idle");
          return;
        }
      }
      setPhase("posting");
      const res = await createMeal({
        meal_type: mealType,
        caption,
        portion,
        tags: [...tags],
        date,
        time,
        photo_staged_key: stagedKey,
        calories: macros.calories,
        protein_g: macros.protein_g,
        carbs_g: macros.carbs_g,
        fat_g: macros.fat_g,
        ai_estimated: aiUsed,
        share_with_coach: share && !!coachName,
      });
      setPhase("idle");
      if (res.error) {
        setError(res.error === "photo_missing" ? t("post.uploadFail") : t("common.error"));
        return;
      }
      router.push(`/food${res.date ? `?date=${res.date}` : ""}`);
      router.refresh();
    });
  }

  const art = FOOD_ART_BY_MEAL[mealType];
  const busy = phase !== "idle";

  return (
    <form
      className="flex flex-col gap-[18px]"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {/* Photo */}
      <div className={cn("relative flex h-[220px] items-center justify-center overflow-hidden rounded-[26px] sm:h-[280px]", !photo && art.bg)}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <FoodArt kind={art.kind} size={180} />
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => onPick(e.target.files?.[0])}
          aria-label={photo ? t("post.changePhoto") : t("post.addPhoto")}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="absolute right-3 bottom-3 flex min-h-11 items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-bold text-text shadow-sm transition active:scale-95"
        >
          <Icon name="camera" size={18} strokeWidth={2} />
          {photo ? t("post.changePhoto") : t("post.addPhoto")}
        </button>
        {photo && (
          <span
            role="status"
            className={cn(
              "absolute top-3 left-3 flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-extrabold shadow-sm",
              photo.status === "ready" ? "bg-mint text-ink" : photo.status === "error" ? "bg-berry text-ink" : "bg-card text-text",
            )}
          >
            {photo.status === "uploading" && <span className="h-3 w-3 animate-spin rounded-full border-2 border-grape border-t-transparent" />}
            {photo.status === "ready" && <Icon name="check" size={14} strokeWidth={3} />}
            {photo.status === "uploading" ? t("post.photoUploading") : photo.status === "ready" ? t("post.photoReady") : t("post.photoFailed")}
          </span>
        )}
        {photo?.status === "error" && uploadEnabled && (
          <button
            type="button"
            onClick={retry}
            className="absolute top-3 right-3 flex min-h-8 items-center rounded-full bg-card px-3 text-xs font-extrabold text-berry-d shadow-sm"
          >
            {t("post.retry")}
          </button>
        )}
      </div>

      {/* AI status */}
      {ai.status !== "idle" && (
        <div
          role="status"
          className={cn(
            "flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-[13px] font-semibold",
            ai.status === "error" ? "bg-sun-s text-sun-d" : "bg-grape-s text-grape-d",
          )}
        >
          {ai.status === "error" && ai.reason === "fail" ? (
            <Beru pose="alarm" size={52} className="-my-2 shrink-0" />
          ) : (
            <Icon name="sparkle" size={18} className={cn("mt-px shrink-0", ai.status === "loading" && "animate-pulse")} />
          )}
          <span className="flex-1">
            {ai.status === "loading" && t("post.estimating")}
            {ai.status === "done" && (
              <>
                {t("post.estimated", { c: t(`post.confidence.${ai.estimate.confidence}` as DictKey) })}
                {ai.estimate.note && <span className="mt-1 block font-medium opacity-90">{ai.estimate.note}</span>}
              </>
            )}
            {ai.status === "error" && (ai.reason === "nokey" ? t("post.estimateNoKey") : t("post.estimateFail"))}
          </span>
        </div>
      )}

      {/* Meal type + time */}
      <div className="flex flex-col gap-2">
        <span className={label}>{t("post.mealTime")}</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MEAL_TYPES.map((m) => (
            <button key={m} type="button" aria-pressed={mealType === m} onClick={() => setMealType(m)} className={optionClass(mealType === m)}>
              {t(`meal.${m}` as DictKey)}
            </button>
          ))}
        </div>
        <label className="mt-1 flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-line bg-card px-4 py-2">
          <span className="text-sm font-bold">{t("post.eatenAt")}</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required className="bg-transparent text-right font-display text-lg font-semibold focus:outline-none" />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="caption" className={label}>
          {t("post.caption")}
        </label>
        <textarea
          id="caption"
          rows={3}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={t("post.captionPh")}
          maxLength={500}
          className={cn(input, "resize-none leading-normal")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>{t("post.portion")}</span>
        <div className="grid grid-cols-3 gap-2">
          {PORTIONS.map((p) => (
            <button key={p} type="button" aria-pressed={portion === p} onClick={() => setPortion(p)} className={optionClass(portion === p)}>
              {t(`portion.${p}` as DictKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>{t("post.plate")}</span>
        <div className="flex flex-wrap gap-2">
          {MEAL_TAGS.map((g) => {
            const on = tags.has(g);
            return (
              <button
                key={g}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setTags((prev) => {
                    const next = new Set(prev);
                    if (on) next.delete(g);
                    else next.add(g);
                    return next;
                  })
                }
                className={cn(
                  "min-h-11 rounded-full border-[1.5px] px-4 text-[13px] font-bold transition active:scale-95",
                  on ? "border-mint bg-mint-s text-mint-d" : "border-line bg-card text-muted",
                )}
              >
                {on ? "✓ " : "+ "}
                {t(`tag.${g}` as DictKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calories & macros */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className={label}>{t("post.nutrition")}</span>
          {photo && ai.status !== "loading" && (
            <button type="button" onClick={() => estimate(photo.original)} className={btn.ghost}>
              <Icon name="sparkle" size={16} />
              {t("post.estimate")}
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              ["calories", t("common.kcal")],
              ["protein_g", `${t("macro.protein")} (g)`],
              ["carbs_g", `${t("macro.carbs")} (g)`],
              ["fat_g", `${t("macro.fat")} (g)`],
            ] as const
          ).map(([key, text]) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-muted">{text}</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={macros[key]}
                onChange={(e) => {
                  setMacros((m) => ({ ...m, [key]: e.target.value }));
                }}
                placeholder="–"
                className={cn(input, "px-2 text-center font-bold", key === "calories" && "border-mango")}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Share with coach */}
      <div className="flex items-center gap-3 rounded-[20px] border border-line bg-card px-4 py-3.5">
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-sm font-bold">{coachName ? t("post.shareWith", { name: coachName }) : t("post.shareCoach")}</span>
          <span className="text-xs text-muted">{coachName ? t("post.shareDesc") : t("post.noCoach")}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={share}
          aria-label={t("post.shareCoach")}
          disabled={!coachName}
          onClick={() => setShare((s) => !s)}
          className={cn("relative h-8 w-[54px] shrink-0 rounded-2xl transition disabled:opacity-50", share ? "bg-grape" : "bg-line")}
        >
          <span className={cn("absolute top-1 h-6 w-6 rounded-full bg-white transition-all", share ? "left-[26px]" : "left-1")} />
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-berry-s px-4 py-3 text-sm font-semibold text-berry-d">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy || ai.status === "loading"} className={cn(btn.mango, "h-[58px]")}>
        {phase === "uploading"
          ? t("post.uploading")
          : phase === "posting"
            ? t("post.posting")
            : t("post.submit")}
      </button>
      {photo?.status === "error" && !busy && (
        <button type="button" onClick={() => submit(true)} className={cn(btn.outline, "h-12 text-base")}>
          {t("post.postWithoutPhoto")}
        </button>
      )}
    </form>
  );
}
