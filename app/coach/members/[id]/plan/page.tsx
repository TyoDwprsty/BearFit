import Link from "next/link";
import { PublishPlan } from "@/components/coach/PublishPlan";
import { Icon } from "@/components/Icon";
import { WorkoutPicker } from "@/components/workout/WorkoutPicker";
import { BackHeader } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { requireMember } from "@/lib/coach";
import { addDays, formatLongDate, isValidDateStr, todayIn } from "@/lib/dates";
import { getExerciseCatalog, getPlan } from "@/lib/data";
import { firstName } from "@/lib/format";
import { makeT } from "@/lib/i18n";

export const metadata = { title: "Rencana Latihan" };

export default async function CoachPlanPage({ params, searchParams }: PageProps<"/coach/members/[id]/plan">) {
  const viewer = await requireViewer("coach");
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);
  const { id } = await params;
  const member = await requireMember(supabase, userId, id);
  const today = todayIn(member.timezone);
  const sp = await searchParams;
  const date = isValidDateStr(sp.date as string) ? (sp.date as string) : addDays(today, 1);

  const [plan, catalog] = await Promise.all([getPlan(supabase, id, date), getExerciseCatalog(supabase)]);
  const base = `/coach/members/${id}/plan`;

  return (
    <div className="flex flex-col gap-4">
      <BackHeader href={`/coach/members/${id}?tab=plan`} backLabel={t("common.back")} title={t("coach.planFor", { name: firstName(member.full_name) })} />

      <div className="flex items-center justify-between gap-2 rounded-[22px] bg-grape-s p-2">
        <Link href={`${base}?date=${addDays(date, -1)}`} replace aria-label="←" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card">
          <Icon name="back" size={20} />
        </Link>
        <span className="text-center font-display text-lg font-semibold">
          {date === today ? t("common.today") : date === addDays(today, 1) ? t("common.tomorrow") : ""} {formatLongDate(date, profile.locale)}
        </span>
        <Link href={`${base}?date=${addDays(date, 1)}`} replace aria-label="→" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card">
          <Icon name="chevron" size={20} />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <WorkoutPicker memberId={id} date={date} catalog={catalog} items={plan.items} mode="coach" footer={null} />
        <div className="lg:sticky lg:top-10">
          <PublishPlan memberId={id} date={date} note={plan.plan?.note ?? ""} />
        </div>
      </div>
    </div>
  );
}
