"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addExercise, removeItem, updateItemDose } from "@/app/actions/workout";
import { startNavigation, useProgress } from "@/components/feedback/NavigationProgress";
import { useToast } from "@/components/feedback/FeedbackProvider";
import { CATEGORY_ICON, Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { Sheet } from "@/components/Sheet";
import { btn, CATEGORY_TILE, cn, input } from "@/components/ui";
import { CATEGORIES, exerciseMeta, exerciseName } from "@/lib/format";
import type { DictKey } from "@/lib/i18n";
import type { Exercise, ExerciseCategory, WorkoutItem } from "@/lib/types";
import { useBackToClose } from "@/lib/use-back-nav";
import { DOSE_LIMITS, doseKind, LEVELS, levelDose, levelOf, normalizeDose, type Dose } from "@/lib/workout-dose";

type Filter = "all" | ExerciseCategory;
type DoseBase = Pick<Exercise, "sets" | "reps" | "duration_sec" | "minutes">;

/** "Tambah manual": pick any workout by category, choose a dose (level or custom), save. */
export function AddWorkoutSheet({
  open,
  onClose,
  memberId,
  date,
  catalog,
}: {
  open: boolean;
  onClose: () => void;
  memberId: string;
  date: string;
  catalog: Exercise[];
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [picked, setPicked] = useState<Exercise | null>(null);
  const [dose, setDose] = useState<Dose | null>(null);
  const [pending, start] = useTransition();
  useProgress(pending);

  // Back on the dose step returns to the list rather than closing the sheet.
  useBackToClose(open && !!picked, () => setPicked(null));

  const close = () => {
    setPicked(null);
    onClose();
  };

  const pick = (ex: Exercise) => {
    setPicked(ex);
    setDose(levelDose(ex, "experienced"));
  };

  const save = (remind: boolean) =>
    start(async () => {
      if (!picked || !dose) return;
      const res = await addExercise(memberId, date, picked.id, normalizeDose(picked, dose));
      if (!res.ok) {
        toast(t("common.error"), "error");
        return;
      }
      if (remind) {
        startNavigation();
        router.push(`/reminders?add=workout&label=${encodeURIComponent(exerciseName(picked, locale))}`);
        return;
      }
      toast(t("workout.added"));
      close();
    });

  return (
    <Sheet
      open={open}
      onClose={close}
      onBack={() => {
        if (!picked) return false;
        setPicked(null);
        return true;
      }}
      title={picked ? exerciseName(picked, locale) : t("workout.addTitle")}
    >
      {picked && dose ? (
        <div className="flex flex-col gap-4">
          <ExerciseHeader ex={picked} onChange={() => setPicked(null)} />
          <DoseEditor base={picked} value={dose} onChange={setDose} />
          <div className="flex flex-col gap-2">
            <button type="button" disabled={pending} aria-busy={pending} onClick={() => save(false)} className={btn.primary}>
              {t("common.save")}
            </button>
            <button type="button" disabled={pending} onClick={() => save(true)} className={cn(btn.ghost, "self-center")}>
              <Icon name="bell" size={16} />
              {t("workout.saveReminder")}
            </button>
          </div>
        </div>
      ) : (
        <ExerciseList catalog={catalog} onPick={pick} />
      )}
    </Sheet>
  );
}

/** Tap a planned item: change its dose or drop it from the plan. */
export function EditItemSheet({ item, base, onClose }: { item: WorkoutItem | null; base: DoseBase | null; onClose: () => void }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [dose, setDose] = useState<Dose | null>(null);
  const [shown, setShown] = useState<WorkoutItem | null>(null);
  const [pending, start] = useTransition();
  useProgress(pending);

  // Reset the editor whenever another item is opened.
  if (item && item !== shown) {
    setShown(item);
    setDose({ sets: item.sets, reps: item.reps, duration_sec: item.duration_sec, minutes: item.minutes });
  }
  const scale = base ?? item;

  const run = (action: () => Promise<{ ok?: true; error?: string } | void>, done: string) =>
    start(async () => {
      const res = await action();
      if (res && !res.ok) {
        toast(t("common.error"), "error");
        return;
      }
      toast(done);
      onClose();
    });

  return (
    <Sheet open={!!item} onClose={onClose} title={item ? exerciseName(item, locale) : ""}>
      {item && scale && dose && (
        <div className="flex flex-col gap-4">
          <DoseEditor base={scale} value={dose} onChange={setDose} />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={pending}
              aria-busy={pending}
              onClick={() => run(() => updateItemDose(item.id, normalizeDose(scale, dose)), t("common.saved"))}
              className={btn.primary}
            >
              {t("common.save")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => removeItem(item.id), t("common.deleted"))}
              className={cn(btn.ghost, "self-center text-berry-d")}
            >
              <Icon name="trash" size={16} />
              {t("workout.remove")}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function ExerciseList({ catalog, onPick }: { catalog: Exercise[]; onPick: (ex: Exercise) => void }) {
  const { t, locale } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () =>
      [...catalog].sort(
        (a, b) =>
          CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) ||
          exerciseName(a, locale).localeCompare(exerciseName(b, locale), locale),
      ),
    [catalog, locale],
  );
  const q = query.trim().toLowerCase();
  const visible = sorted.filter(
    (x) =>
      (filter === "all" || x.category === filter) &&
      (!q || x.name_id.toLowerCase().includes(q) || x.name_en.toLowerCase().includes(q)),
  );
  // Section headings only while browsing everything; a filter or search is already one list.
  const grouped = filter === "all" && !q;

  return (
    <div className="flex flex-col gap-3">
      <label className="relative">
        <span className="sr-only">{t("workout.search")}</span>
        <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("workout.search")} className={cn(input, "pl-11")} />
      </label>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {(["all", ...CATEGORIES] as Filter[]).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={filter === c}
            onClick={() => setFilter(c)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border-[1.5px] px-4 text-[13px] font-bold transition",
              filter === c ? "border-grape bg-grape text-on-grape" : "border-line bg-card text-text",
            )}
          >
            {t(`cat.${c}` as DictKey)}
          </button>
        ))}
      </div>

      {visible.length === 0 && <p className="py-6 text-center text-sm text-muted">{t("workout.noResults")}</p>}
      <div className="flex flex-col gap-2">
        {visible.map((x, i) => (
          <div key={x.id} className="flex flex-col gap-2">
            {grouped && x.category !== visible[i - 1]?.category && (
              <h3 className={cn("font-display text-base font-semibold", i > 0 && "mt-2")}>{t(`cat.${x.category}` as DictKey)}</h3>
            )}
            <button
              type="button"
              onClick={() => onPick(x)}
              className="flex w-full items-center gap-3 rounded-[20px] border border-line bg-card p-2.5 text-left transition active:scale-[0.99]"
            >
              <CategoryTile category={x.category} />
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-[15px] font-bold">{exerciseName(x, locale)}</span>
                <span className="text-xs font-medium text-muted">
                  {exerciseMeta(x, t)} · {t(`int.${x.intensity}` as DictKey)}
                </span>
              </span>
              <Icon name="chevron" size={18} className="shrink-0 text-muted" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExerciseHeader({ ex, onChange }: { ex: Exercise; onChange: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-soft p-2.5">
      <CategoryTile category={ex.category} />
      <span className="flex-1 text-xs font-bold text-muted">
        {t(`cat.${ex.category}` as DictKey)} · {t(`int.${ex.intensity}` as DictKey)}
      </span>
      <button type="button" onClick={onChange} className={cn(btn.ghost, "shrink-0")}>
        {t("workout.change")}
      </button>
    </div>
  );
}

function CategoryTile({ category }: { category: ExerciseCategory }) {
  return (
    <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", CATEGORY_TILE[category])}>
      <Icon name={CATEGORY_ICON[category]} size={22} />
    </span>
  );
}

/** Level presets (total beginner / experienced / pro) plus steppers; any tweak = Custom. */
function DoseEditor({ base, value, onChange }: { base: DoseBase; value: Dose; onChange: (d: Dose) => void }) {
  const { t } = useI18n();
  const kind = doseKind(base);
  const current = normalizeDose(base, value);
  const level = levelOf(base, current);
  const set = (patch: Partial<Dose>) => onChange(normalizeDose(base, { ...value, ...patch }));

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-bold">{t("workout.dose")}</span>
      <div className="grid grid-cols-2 gap-2">
        {LEVELS.map((l) => {
          const preset = levelDose(base, l);
          return (
            <button
              key={l}
              type="button"
              aria-pressed={level === l}
              onClick={() => onChange(preset)}
              className={cn(
                "flex min-h-14 flex-col items-start justify-center rounded-2xl border-[1.5px] px-3 py-2 text-left transition active:scale-[0.98]",
                level === l ? "border-grape bg-grape text-on-grape" : "border-line bg-card",
              )}
            >
              <span className="text-sm font-bold">{t(`level.${l}` as DictKey)}</span>
              <span className={cn("text-xs font-medium", level === l ? "opacity-85" : "text-muted")}>{exerciseMeta(preset, t)}</span>
            </button>
          );
        })}
        <span
          aria-current={level === "custom"}
          className={cn(
            "flex min-h-14 flex-col items-start justify-center rounded-2xl border-[1.5px] border-dashed px-3 py-2",
            level === "custom" ? "border-grape bg-grape-s text-grape-d" : "border-line text-muted",
          )}
        >
          <span className="text-sm font-bold">{t("level.custom")}</span>
          <span className="text-xs font-medium">{level === "custom" ? exerciseMeta(current, t) : t("workout.customHint")}</span>
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {kind === "minutes" ? (
          <Stepper label={t("workout.duration")} value={value.minutes} limits={DOSE_LIMITS.minutes} onChange={(minutes) => set({ minutes })} />
        ) : (
          <>
            <Stepper label={t("workout.sets")} value={value.sets ?? 1} limits={DOSE_LIMITS.sets} onChange={(sets) => set({ sets })} />
            {kind === "reps" ? (
              <Stepper label={t("workout.reps")} value={value.reps ?? 1} limits={DOSE_LIMITS.reps} onChange={(reps) => set({ reps })} />
            ) : (
              <Stepper
                label={t("workout.secs")}
                value={value.duration_sec ?? DOSE_LIMITS.duration_sec.min}
                limits={DOSE_LIMITS.duration_sec}
                onChange={(duration_sec) => set({ duration_sec })}
              />
            )}
          </>
        )}
      </div>
      {kind !== "minutes" && <span className="text-xs font-bold text-muted">{t("workout.itemEstimate", { m: current.minutes })}</span>}
    </div>
  );
}

function Stepper({
  label,
  value,
  limits,
  onChange,
}: {
  label: string;
  value: number;
  limits: { min: number; max: number; step: number };
  onChange: (n: number) => void;
}) {
  const { t } = useI18n();
  // Free typing; the value is clamped by normalizeDose as soon as it's a number.
  const [draft, setDraft] = useState<string | null>(null);
  const stepBtn = "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-soft transition active:scale-90 disabled:opacity-40";
  return (
    <div className="flex items-center gap-2 rounded-[18px] border border-line bg-card py-1.5 pr-1.5 pl-4">
      <span className="flex-1 text-sm font-bold">{label}</span>
      <button type="button" aria-label={`${t("common.decrease")}: ${label}`} disabled={value <= limits.min} onClick={() => onChange(value - limits.step)} className={stepBtn}>
        <Icon name="minus" size={18} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={limits.min}
        max={limits.max}
        value={draft ?? value}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = parseInt(e.target.value, 10);
          if (Number.isFinite(n)) onChange(n);
        }}
        onBlur={() => setDraft(null)}
        className="w-14 bg-transparent text-center font-display text-xl font-semibold focus:outline-none"
      />
      <button type="button" aria-label={`${t("common.increase")}: ${label}`} disabled={value >= limits.max} onClick={() => onChange(value + limits.step)} className={stepBtn}>
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}
