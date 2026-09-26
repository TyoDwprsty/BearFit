import Link from "next/link";
import { Beru } from "@/components/Beru";
import { Icon } from "@/components/Icon";
import { WorkoutPicker } from "@/components/workout/WorkoutPicker";
import { Chip, PageTitle } from "@/components/ui";
import { getActiveCoach, requireViewer } from "@/lib/auth";
import { addDays, formatLongDate, isValidDateStr, todayIn } from "@/lib/dates";
import { ensurePlanFromProgram, getActiveProgram, getExerciseCatalog } from "@/lib/data";
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

  const [plan, catalog, coach, program] = await Promise.all([
    ensurePlanFromProgram(supabase, userId, date),
    getExerciseCatalog(supabase),
    getActiveCoach(viewer),
    getActiveProgram(supabase, userId),
  ]);

  const title = date === today ? t("workout.title") : `${t("workout.titleDate")} · ${date === addDays(today, 1) ? t("common.tomorrow") : formatLongDate(date, profile.locale)}`;
  const source = plan.plan?.source;

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        eyebrow={formatLongDate(date, profile.locale)}
        title={title}
        actions={
          <div className="flex gap-1.5">
            <Link href={`/workout?date=${addDays(date, -1)}`} replace aria-label="←" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card">
              <Icon name="back" size={20} />
            </Link>
            <Link href={`/workout?date=${addDays(date, 1)}`} replace aria-label="→" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card">
              <Icon name="chevron" size={20} />
            </Link>
          </div>
        }
      />

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

      <WorkoutPicker memberId={userId} date={date} catalog={catalog} items={plan.items} mode="member" />
    </div>
  );
}
