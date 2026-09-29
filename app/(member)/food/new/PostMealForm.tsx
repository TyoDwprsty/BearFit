"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMeal } from "@/app/actions/meals";
import { Beru } from "@/components/Beru";
import { FOOD_ART_BY_MEAL, FoodArt } from "@/components/FoodArt";
import { Icon } from "@/components/Icon";
import { TimeField } from "@/components/TimePicker";
import { useI18n } from "@/components/I18nProvider";
import { btn, cn, input, label, optionClass } from "@/components/ui";
import { MEAL_TAGS, MEAL_TYPES, PORTIONS } from "@/lib/format";
import type { DictKey } from "@/lib/i18n";
import { blobToDataUrl, compressImage } from "@/lib/image-client";
import { usePhotoUpload } from "@/lib/use-photo-upload";
import type { MealGuess, MealType, NutritionEstimate, Portion } from "@/lib/types";
import { startNavigation, useProgress } from "@/components/feedback/NavigationProgress";
import { Alert } from "@/components/feedback/Alert";

type Tag = (typeof MEAL_TAGS)[number];
/**
 * Photo → Beru guesses the meal & portion ("review") → the user corrects the
 * description/portion and taps ✓ → calories, macros and plate tags are filled
 * by the AI ("done"). Editing the description or portion again sends it back
 * to "review". "off"/"error" = manual entry.
 */
type AiState =
  | { status: "off" }
  | { status: "guessing" }
  | { status: "review"; guess: MealGuess }
  | { status: "estimating"; guess: MealGuess }
  | { status: "done"; guess: MealGuess; estimate: NutritionEstimate }
  | { status: "error"; reason: "fail" | "nokey" };

const NO_MACROS = { calories: "", protein_g: "", carbs_g: "", fat_g: "" };

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

  const [mealType, setMealType] = useState<MealType>(defaultType);
  const [portion, setPortion] = useState<Portion>("medium");
  const [tags, setTags] = useState<Set<Tag>>(new Set());
  const [caption, setCaption] = useState("");
  const [time, setTime] = useState(defaultTime);
  const [share, setShare] = useState(!!coachName);
  // Picked photo is compressed to WebP and staged in R2 right away (see usePhotoUpload).
  // `photo.original` feeds the AI as a sharp JPEG.
  const { photo, pick, retry, waitForKey } = usePhotoUpload({ enabled: uploadEnabled });
  const [macros, setMacros] = useState(NO_MACROS);
  const [aiUsed, setAiUsed] = useState(false);
  const [ai, setAi] = useState<AiState>({ status: "off" });
  const [phase, setPhase] = useState<"idle" | "uploading" | "posting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  // JPEG copy for the AI, made once when the photo is picked: Android often
  // refuses to read the picked file a second time, which made re-estimating fail.
  const aiImage = useRef<Promise<string> | null>(null);
  // Ignores AI replies that arrive after the photo or description changed.
  const aiRun = useRef(0);

  // While Beru handles the meal, the plate and nutrition fields are AI-only.
  const aiLocked = ai.status === "guessing" || ai.status === "review" || ai.status === "estimating" || ai.status === "done";

  async function askAi<T>(mode: "guess" | "estimate"): Promise<T> {
    const image = await aiImage.current;
    if (!image) throw new Error("no image");
    const res = await fetch("/api/ai/nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, caption, portion, mode }),
    });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as T;
  }

  function resetAiResult() {
    setMacros(NO_MACROS);
    setTags(new Set());
    setAiUsed(false);
  }

  async function guess() {
    if (!aiEnabled) {
      setAi({ status: "error", reason: "nokey" });
      return;
    }
    const run = ++aiRun.current;
    setAi({ status: "guessing" });
    resetAiResult();
    try {
      const g = await askAi<MealGuess>("guess");
      if (run !== aiRun.current) return;
      // Not food / unreadable photo → Beru "can't see" it.
      if (!g.is_food || !g.name) {
        setAi({ status: "error", reason: "fail" });
        return;
      }
      setAi({ status: "review", guess: g });
      setCaption((c) => (c.trim() ? c : g.name));
      setPortion(g.portion);
    } catch {
      if (run === aiRun.current) setAi({ status: "error", reason: "fail" });
    }
  }

  async function count() {
    if (ai.status !== "review") return;
    const { guess: g } = ai;
    const run = ++aiRun.current;
    setAi({ status: "estimating", guess: g });
    try {
      const est = await askAi<NutritionEstimate>("estimate");
      if (run !== aiRun.current) return;
      if (!est.calories) {
        setAi({ status: "error", reason: "fail" });
        return;
      }
      setAi({ status: "done", guess: g, estimate: est });
      setMacros({
        calories: String(est.calories),
        protein_g: String(est.protein_g),
        carbs_g: String(est.carbs_g),
        fat_g: String(est.fat_g),
      });
      setTags(new Set(est.tags as Tag[]));
      setAiUsed(true);
    } catch {
      if (run === aiRun.current) setAi({ status: "error", reason: "fail" });
    }
  }

  /** The description or portion changed: the old calories no longer apply until ✓ again. */
  function invalidate() {
    if (ai.status !== "done" && ai.status !== "estimating") return;
    aiRun.current++;
    setAi({ status: "review", guess: ai.guess });
    resetAiResult();
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    // JPEG is the safest format for vision models; 1024px keeps food details readable.
    const image = compressImage(file, { maxSide: 1024, quality: 0.85, type: "image/jpeg" }).then(blobToDataUrl);
    image.catch(() => {});
    aiImage.current = image;
    try {
      await pick(file);
      void guess();
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
      startNavigation();
      // Replace: back from the feed shouldn't reopen the finished form.
      router.replace(`/food${res.date ? `?date=${res.date}` : ""}`);
      router.refresh();
    });
  }

  const photoSources = [
    { icon: "camera", text: t("post.camera"), capture: true },
    { icon: "image", text: t("post.gallery"), capture: false },
  ] as const;
  const art = FOOD_ART_BY_MEAL[mealType];
  const busy = phase !== "idle";
  useProgress(busy);

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
        {/* Camera opens the rear camera directly; Gallery uses the system picker. Both go through onPick (compression). */}
        <div className="absolute right-3 bottom-3 flex gap-2">
          {photoSources.map(({ icon, text, capture }) => (
            <label
              key={icon}
              className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-bold text-text shadow-sm transition focus-within:outline-2 focus-within:outline-grape active:scale-95"
            >
              <input
                type="file"
                accept="image/*"
                capture={capture ? "environment" : undefined}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = ""; // allow picking the same photo again
                  void onPick(file);
                }}
                aria-label={`${photo ? t("post.changePhoto") : t("post.addPhoto")}: ${text}`}
              />
              <Icon name={icon} size={18} strokeWidth={2} />
              {text}
            </label>
          ))}
        </div>
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
      {ai.status !== "off" && (
        <div
          role="status"
          className={cn(
            "flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-[13px] font-semibold",
            ai.status === "error" ? "bg-sun-s text-sun-d" : ai.status === "review" ? "bg-mango-s text-mango-d" : "bg-grape-s text-grape-d",
          )}
        >
          {ai.status === "error" && ai.reason === "fail" ? (
            <Beru pose="alarm" size={52} className="-my-2 shrink-0" />
          ) : ai.status === "review" ? (
            <Beru pose="eat" size={52} className="-my-2 shrink-0" />
          ) : (
            <Icon
              name="sparkle"
              size={18}
              className={cn("mt-px shrink-0", (ai.status === "guessing" || ai.status === "estimating") && "animate-pulse")}
            />
          )}
          <span className="flex-1">
            {ai.status === "guessing" && t("post.identifying")}
            {ai.status === "review" &&
              t("post.guess", { name: ai.guess.name, portion: t(`portion.${ai.guess.portion}` as DictKey).toLowerCase() })}
            {ai.status === "estimating" && t("post.estimating")}
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
        <div className="mt-1 flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-line bg-card py-2 pl-4 pr-2">
          <span className="text-sm font-bold">{t("post.eatenAt")}</span>
          <TimeField
            value={time}
            onChange={setTime}
            label={t("post.eatenAt")}
            className="flex min-h-11 items-center gap-2 rounded-xl px-2 font-display text-lg font-semibold transition active:scale-95"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="caption" className={label}>
          {t("post.caption")}
        </label>
        <textarea
          id="caption"
          rows={3}
          value={caption}
          onChange={(e) => {
            setCaption(e.target.value);
            invalidate();
          }}
          placeholder={t("post.captionPh")}
          maxLength={500}
          className={cn(input, "resize-none leading-normal")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>{t("post.portion")}</span>
        <div className="grid grid-cols-3 gap-2">
          {PORTIONS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={portion === p}
              onClick={() => {
                if (p === portion) return;
                setPortion(p);
                invalidate();
              }}
              className={optionClass(portion === p)}
            >
              {t(`portion.${p}` as DictKey)}
            </button>
          ))}
        </div>
      </div>

      {(ai.status === "review" || ai.status === "estimating") && (
        <button type="button" onClick={count} disabled={ai.status === "estimating"} aria-busy={ai.status === "estimating"} className={cn(btn.primary, "h-13 text-base")}>
          <Icon name="check" size={20} strokeWidth={3} />
          {ai.status === "estimating" ? t("post.estimating") : t("post.confirm")}
        </button>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className={label}>{t("post.plate")}</span>
          {aiLocked && <AutoByAi />}
        </div>
        <div className="flex flex-wrap gap-2">
          {MEAL_TAGS.map((g) => {
            const on = tags.has(g);
            return (
              <button
                key={g}
                type="button"
                aria-pressed={on}
                disabled={aiLocked}
                onClick={() =>
                  setTags((prev) => {
                    const next = new Set(prev);
                    if (on) next.delete(g);
                    else next.add(g);
                    return next;
                  })
                }
                className={cn(
                  "min-h-11 rounded-full border-[1.5px] px-4 text-[13px] font-bold transition active:scale-95 disabled:active:scale-100",
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
          {aiLocked ? (
            <AutoByAi />
          ) : (
            photo &&
            ai.status === "error" &&
            ai.reason === "fail" && (
              <button type="button" onClick={guess} className={btn.ghost}>
                <Icon name="sparkle" size={16} />
                {t("post.estimate")}
              </button>
            )
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
                readOnly={aiLocked}
                onChange={(e) => {
                  setMacros((m) => ({ ...m, [key]: e.target.value }));
                }}
                placeholder="–"
                className={cn(input, "px-2 text-center font-bold", key === "calories" && "border-mango", aiLocked && "bg-soft focus:border-line")}
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
        <Alert>{error}</Alert>
      )}

      {aiLocked && ai.status !== "done" && <p className="-mb-2 text-center text-xs font-semibold text-muted">{t("post.confirmFirst")}</p>}
      <button type="submit" disabled={busy || (aiLocked && ai.status !== "done")} aria-busy={busy} className={cn(btn.mango, "h-[58px]")}>
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

/** Marks a section whose values come from Beru's estimate. */
function AutoByAi() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-grape-d">
      <Icon name="sparkle" size={14} />
      {t("post.autoByAi")}
    </span>
  );
}
