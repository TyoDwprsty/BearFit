import { Beru } from "@/components/Beru";
import { DatePickerButton } from "@/components/DatePickerButton";
import { WeekStrip, type DayMark } from "@/components/WeekStrip";
import { AskCoachCard } from "@/components/workout/AskCoachCard";
import { WorkoutPicker } from "@/components/workout/WorkoutPicker";
import { Chip, PageTitle } from "@/components/ui";
import { getActiveCoach, requireViewer } from "@/lib/auth";
import { addDays, formatLongDate, isValidDateStr, todayIn, weekStart } from "@/lib/dates";
import { ensurePlanFromProgram, getExerciseCatalog, getProgramSchedule, scheduledFor } from "@/lib/data";
import { firstName } from "@/lib/format";
import { makeT } from "@/lib/i18n";

export const metadata = { title: "Latihan" };

export default async function WorkoutPage({ searchParams }: PageProps<"/workout">) {
  const viewer = await requireViewer("member");
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);
  const today = todayIn(profile.timezone);
  const params = await searchParams;
  const date = isValidDateStr(params.date as string) ? (params.date as string) : today;

  const monday = weekStart(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const [plan, catalog, coach, program, weekPlans] = await Promise.all([
    ensurePlanFromProgram(supabase, userId, date),
    getExerciseCatalog(supabase),
    getActiveCoach(viewer),
    getProgramSchedule(supabase, userId),
    supabase
      .from("workout_plans")
      .select("plan_date, workout_items(done_at)")
      .eq("member_id", userId)
      .gte("plan_date", days[0])
      .lte("plan_date", days[6]),
  ]);

  // Dot per day: mint = every exercise done, grape = something planned.
  const marks: Record<string, DayMark> = {};
  const rows = (weekPlans.data ?? []) as { plan_date: string; workout_items: { done_at: string | null }[] }[];
  for (const p of rows) {
    if (!p.workout_items.length) continue;
    marks[p.plan_date] = p.workout_items.every((i) => i.done_at) ? "done" : "planned";
  }
  // Program days that haven't been opened yet (no plan row) are planned too.
  const hasRow = new Set(rows.map((p) => p.plan_date));
  for (const d of days) if (!hasRow.has(d) && scheduledFor(program, d).length) marks[d] = "planned";
  // The selected day may have just been created from the program template above.
  if (plan.items.length) marks[date] = plan.items.every((i) => i.done_at) ? "done" : "planned";

  const title = date === today ? t("workout.title") : `${t("workout.titleDate")} · ${date === addDays(today, 1) ? t("common.tomorrow") : formatLongDate(date, profile.locale)}`;
  const source = plan.plan?.source;
  const requested = !!plan.plan?.requested_at;
  // Offer "let my coach do it" for today & upcoming days the coach/program hasn't filled in.
  const canAsk = !!coach && date >= today && (requested || (source !== "coach" && source !== "program"));

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        eyebrow={formatLongDate(date, profile.locale)}
        title={title}
        actions={<DatePickerButton value={date} label={t("food.openCalendar")} />}
      />

      <WeekStrip days={days} selected={date} hrefFor={(d) => `/workout?date=${d}`} locale={profile.locale} marks={marks} accent="grape" />

      <div className="flex items-center gap-1.5 rounded-[28px] bg-grape-s py-3.5 pr-2 pl-[18px]">
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="font-display text-xl leading-tight font-semibold">{t("workout.heroTitle")}</span>
          <span className="text-[13px] leading-snug text-muted">{t("workout.heroBody")}</span>
          {source === "coach" && coach && (
            <Chip accent="grape" className="self-start">
              {t("workout.fromCoach", { name: `${t("common.coach")} ${firstName(coach.full_name)}` })}
            </Chip>
          )}
          {source === "program" && program && (
            <Chip accent="grape" className="self-start">
              {t("workout.fromProgram", { name: program.program.name })}
            </Chip>
          )}
        </div>
        <Beru pose="lift" size={108} />
      </div>

      {plan.plan?.note && (
        <p className="rounded-2xl border border-line bg-card px-4 py-3 text-sm leading-relaxed">
          <strong className="mr-1 text-grape-d">{coach ? firstName(coach.full_name) : t("common.coach")}:</strong>
          {plan.plan.note}
        </p>
      )}

      {canAsk && coach && <AskCoachCard date={date} coachName={firstName(coach.full_name)} requested={requested} />}

      <WorkoutPicker memberId={userId} date={date} catalog={catalog} items={plan.items} mode="member" />
    </div>
  );
}
