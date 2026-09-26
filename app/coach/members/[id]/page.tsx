import Link from "next/link";
import { assignProgram, unassignProgram } from "@/app/actions/coach";
import { QuickNote } from "@/components/coach/QuickNote";
import { ConfirmActionButton } from "@/components/feedback/ConfirmActionButton";
import { CATEGORY_ICON, Icon } from "@/components/Icon";
import { CommentForm, LikeButton } from "@/components/member/MealInteractions";
import { MealPhoto } from "@/components/member/MealPhoto";
import { NutritionSummary } from "@/components/member/widgets";
import { TargetsForm } from "@/components/profile/TargetsForm";
import { Avatar, BackHeader, btn, Card, Chip, cn, input, SegmentedLinks, SOFT } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { memberDay, requireMember } from "@/lib/coach";
import { addDays, formatClock, formatLongDate, formatShortDate, localDateOf, rangeUtc, todayIn, weekdayShort } from "@/lib/dates";
import { getActiveProgram, getActivity, getMealsForDay, getPlan, sumNutrition } from "@/lib/data";
import { exerciseMeta, exerciseName, firstName } from "@/lib/format";
import { makeT, type DictKey } from "@/lib/i18n";
import { hydrateMeals } from "@/lib/meal-posts";
import type { Program, Targets, WorkoutItem, WorkoutPlan } from "@/lib/types";

export const metadata = { title: "Detail Anggota" };

type Tab = "today" | "week" | "plan";

export default async function MemberDetailPage({ params, searchParams }: PageProps<"/coach/members/[id]">) {
  const viewer = await requireViewer("coach");
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = sp.tab === "week" || sp.tab === "plan" ? sp.tab : "today";

  const member = await requireMember(supabase, userId, id);
  const tz = member.timezone;
  const today = todayIn(tz);
  const name = firstName(member.full_name);

  const [program, activity, targetsRes, mealsToday, planToday] = await Promise.all([
    getActiveProgram(supabase, id),
    getActivity(supabase, id, tz, today, 90),
    supabase.from("targets").select("*").eq("user_id", id).single(),
    getMealsForDay(supabase, id, today, tz),
    getPlan(supabase, id, today),
  ]);
  const targets = targetsRes.data as Targets;
  const d = memberDay(member.since, tz, program);

  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const workoutDays = last7.filter((x) => (activity.minutesByDate.get(x) ?? 0) > 0).length;
  const [wFrom, wTo] = rangeUtc(last7[0], addDays(today, 1), tz);
  const { data: weekMealsRaw } = await supabase
    .from("meals")
    .select("eaten_at, calories")
    .eq("user_id", id)
    .gte("eaten_at", wFrom)
    .lt("eaten_at", wTo);
  const weekMeals = weekMealsRaw ?? [];

  const tomorrow = addDays(today, 1);
  const base = `/coach/members/${id}`;

  return (
    <div className="flex flex-col gap-4">
      <BackHeader
        href="/coach"
        backLabel={t("common.back")}
        title={t("coach.detail")}
        right={
          <Link
            href={`/coach/chat/${id}`}
            aria-label={t("coach.message", { name })}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card"
          >
            <Icon name="chat" size={20} strokeWidth={2} />
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-4 lg:sticky lg:top-10">
          <Card className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3.5">
              <Avatar name={member.full_name} src={member.avatar_url} id={member.id} size={60} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-display text-[22px] font-semibold">{member.full_name}</span>
                <span className="text-[13px] font-medium text-muted">
                  {d.program ? t("coach.dayProgram", { n: d.day, program: d.program }) : t("coach.dayJoined", { n: d.day })}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat value={String(activity.current)} label={t("coach.streak")} cls={SOFT.berry} />
              <MiniStat value={`${workoutDays}/7`} label={t("coach.workoutDays")} cls={SOFT.grape} />
              <MiniStat value={String(weekMeals.length)} label={t("coach.mealsLogged")} cls={SOFT.mint} />
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-[17px] font-semibold">{t("home.nutrition")}</h2>
            <NutritionSummary totals={sumNutrition(mealsToday)} targets={targets} t={t} compact />
          </Card>

          <div className="hidden lg:block">
            <QuickNote memberId={id} memberName={name} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SegmentedLinks
            items={[
              { href: base, label: t("coach.tab.today"), active: tab === "today" },
              { href: `${base}?tab=week`, label: t("coach.tab.week"), active: tab === "week" },
              { href: `${base}?tab=plan`, label: t("coach.tab.plan"), active: tab === "plan" },
            ]}
          />

          {tab === "today" &&
            (await renderTimeline({
              coachId: userId,
              meals: mealsToday,
              plan: planToday.plan,
              items: planToday.items,
              tz,
              locale: profile.locale,
            }))}

          {tab === "week" && (
            <div className="flex flex-col gap-2">
              {[...last7].reverse().map((date) => {
                const meals = weekMeals.filter((m) => localDateOf(m.eaten_at, tz) === date);
                const kcal = meals.reduce((a, m) => a + (m.calories ?? 0), 0);
                const mins = activity.minutesByDate.get(date) ?? 0;
                const active = activity.activeDates.has(date);
                return (
                  <div key={date} className="flex items-center gap-3 rounded-[20px] border border-line bg-card px-3.5 py-3">
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[14px] leading-none",
                        active ? "bg-mint-s text-mint-d" : "bg-soft text-muted",
                      )}
                    >
                      <span className="text-[10px] font-bold">{weekdayShort(date, profile.locale)}</span>
                      <span className="font-display text-base font-semibold">{Number(date.slice(8))}</span>
                    </span>
                    <span className="flex-1 text-[13px] font-semibold">
                      {t("coach.weekRow", { meals: meals.length, mins, kcal })}
                    </span>
                    {active && <Icon name="check" size={18} strokeWidth={3} className="text-mint-d" />}
                  </div>
                );
              })}
            </div>
          )}

          {tab === "plan" && (await renderPlanTab({ memberId: id, coachId: userId, today, program, targets, name }))}

          <div className="lg:hidden">
            <QuickNote memberId={id} memberName={name} />
          </div>

          <Link href={`${base}/plan?date=${tomorrow}`} className={cn(btn.outline, "h-[52px] border-grape text-sm font-extrabold text-grape-d")}>
            <Icon name="program" size={18} />
            {t("coach.planTomorrow")}
          </Link>
        </div>
      </div>
    </div>
  );

  async function renderTimeline({
    coachId,
    meals,
    plan,
    items,
    tz,
    locale,
  }: {
    coachId: string;
    meals: Awaited<ReturnType<typeof getMealsForDay>>;
    plan: WorkoutPlan | null;
    items: WorkoutItem[];
    tz: string;
    locale: "id" | "en";
  }) {
    const { posts, people } = await hydrateMeals(supabase, meals);
    type Entry = { at: string; kind: "meal"; post: (typeof posts)[number] } | { at: string; kind: "item"; item: WorkoutItem };
    const entries: Entry[] = [
      ...posts.map((p) => ({ at: p.meal.eaten_at, kind: "meal" as const, post: p })),
      ...items.filter((i) => i.done_at).map((i) => ({ at: i.done_at!, kind: "item" as const, item: i })),
    ].sort((a, b) => a.at.localeCompare(b.at));
    const open = items.filter((i) => !i.done_at);

    if (!entries.length && !open.length) {
      return <p className="rounded-[20px] border-2 border-dashed border-line px-4 py-8 text-center text-sm font-semibold text-muted">{t("coach.timelineEmpty")}</p>;
    }

    return (
      <div className="relative flex flex-col gap-3.5">
        <span className="absolute top-5 bottom-8 left-[21px] w-0.5 bg-line" aria-hidden />
        {entries.map((e) =>
          e.kind === "meal" ? (
            <div key={e.post.meal.id} className="relative flex gap-3">
              <span className="z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mango text-ink">
                <Icon name="food" size={20} />
              </span>
              <div className="flex flex-1 flex-col gap-2.5 rounded-[20px] border border-line bg-card p-3">
                <div className="flex gap-3">
                  <MealPhoto meal={e.post.meal} className="h-16 w-16 shrink-0 rounded-[14px]" artSize={56} />
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="text-xs font-bold text-muted">
                      {formatClock(e.post.meal.eaten_at, tz, locale)} · {t(`meal.${e.post.meal.meal_type}` as DictKey)}
                    </span>
                    <span className="text-sm leading-snug font-bold">{e.post.meal.caption || "—"}</span>
                    {e.post.meal.calories != null && (
                      <span className="text-xs font-semibold text-muted">
                        {t("macro.summary", {
                          kcal: e.post.meal.calories,
                          p: Math.round(Number(e.post.meal.protein_g ?? 0)),
                          c: Math.round(Number(e.post.meal.carbs_g ?? 0)),
                          f: Math.round(Number(e.post.meal.fat_g ?? 0)),
                        })}
                        {e.post.meal.ai_estimated && " · AI"}
                      </span>
                    )}
                    {!e.post.likedBy.includes(coachId) && !e.post.comments.some((c) => c.author_id === coachId) && (
                      <span className="text-xs font-semibold text-grape-d">{t("coach.notResponded")}</span>
                    )}
                  </div>
                </div>
                {e.post.comments.map((c) => (
                  <p key={c.id} className="rounded-xl bg-soft px-3 py-2 text-[13px]">
                    <strong>{c.author_id === coachId ? t("chat.you") : firstName(people.get(c.author_id)?.full_name)}</strong> {c.body}
                  </p>
                ))}
                <div className="flex flex-wrap items-center gap-2">
                  <LikeButton mealId={e.post.meal.id} liked={e.post.likedBy.includes(coachId)} />
                </div>
                <CommentForm mealId={e.post.meal.id} placeholder={t("food.comment")} />
              </div>
            </div>
          ) : (
            <div key={e.item.id} className="relative flex gap-3">
              <span className="z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint text-ink">
                <Icon name={CATEGORY_ICON[e.item.category]} size={20} />
              </span>
              <div className="flex flex-1 items-center gap-2.5 rounded-[20px] border border-line bg-card px-3.5 py-3">
                <div className="flex flex-1 flex-col gap-[3px]">
                  <span className="text-xs font-bold text-muted">
                    {formatClock(e.item.done_at!, tz, locale)} · {t("nav.workout")}
                  </span>
                  <span className="text-sm font-bold">
                    {exerciseName(e.item, locale)} · {exerciseMeta(e.item, t)}
                  </span>
                </div>
                <Chip accent="mint" className="text-[11px] font-extrabold">
                  {t("workout.done")}
                </Chip>
              </div>
            </div>
          ),
        )}
        {open.length > 0 && (
          <div className="relative flex gap-3">
            <span className="z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-grape bg-bg text-grape-d">
              <Icon name="clock" size={20} />
            </span>
            <div className="flex flex-1 items-center gap-2.5 rounded-[20px] border-[1.5px] border-dashed border-line px-3.5 py-3">
              <div className="flex flex-1 flex-col gap-[3px]">
                <span className="text-xs font-bold text-muted">
                  {t("coach.scheduled")}
                  {plan?.source === "program" ? ` · ${t("nav.programs")}` : ""}
                </span>
                <span className="text-sm leading-snug font-bold">{open.map((i) => `${exerciseName(i, locale)} ${exerciseMeta(i, t)}`).join(" + ")}</span>
              </div>
              <Chip accent="sun" className="text-[11px] font-extrabold">
                {t("coach.waiting")}
              </Chip>
            </div>
          </div>
        )}
      </div>
    );
  }

  async function renderPlanTab({
    memberId,
    coachId,
    today,
    program,
    targets,
    name,
  }: {
    memberId: string;
    coachId: string;
    today: string;
    program: Awaited<ReturnType<typeof getActiveProgram>>;
    targets: Targets;
    name: string;
  }) {
    const upcoming = Array.from({ length: 7 }, (_, i) => addDays(today, i));
    const [{ data: plans }, { data: myPrograms }] = await Promise.all([
      supabase
        .from("workout_plans")
        .select("plan_date, source, workout_items(id, name_id, name_en, minutes)")
        .eq("member_id", memberId)
        .gte("plan_date", upcoming[0])
        .lte("plan_date", upcoming[6]),
      supabase.from("programs").select("*").eq("coach_id", coachId).order("created_at"),
    ]);
    const byDate = new Map(
      ((plans ?? []) as { plan_date: string; source: string; workout_items: Pick<WorkoutItem, "id" | "name_id" | "name_en" | "minutes">[] }[]).map((p) => [
        p.plan_date,
        p,
      ]),
    );

    return (
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-[17px] font-semibold">{t("coach.upcoming")}</h2>
          {upcoming.map((date) => {
            const p = byDate.get(date);
            return (
              <Link
                key={date}
                href={`/coach/members/${memberId}/plan?date=${date}`}
                className="flex items-center gap-3 rounded-2xl border border-line px-3 py-2.5 transition hover:bg-soft"
              >
                <span className="w-20 shrink-0 text-xs font-bold text-muted">
                  {date === today ? t("common.today") : `${weekdayShort(date, profile.locale)}, ${formatShortDate(date, profile.locale)}`}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                  {p?.workout_items.length
                    ? p.workout_items.map((i) => exerciseName(i, profile.locale)).join(", ")
                    : program
                      ? `${t("nav.programs")}: ${program.program.name}`
                      : t("coach.restDay")}
                </span>
                <span className="text-xs font-extrabold text-grape-d">{t("coach.editDay")}</span>
              </Link>
            );
          })}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-[17px] font-semibold">{t("coach.assignProgram")}</h2>
          {program ? (
            <div className="flex items-center gap-3 rounded-2xl bg-grape-s p-3">
              <Icon name="program" size={22} className="text-grape-d" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-bold">{program.program.name}</span>
                <span className="text-xs text-muted">
                  {formatLongDate(program.assignment.start_date, profile.locale)} · {t("programs.weeksN", { n: program.program.weeks })}
                </span>
              </div>
              <ConfirmActionButton
                action={unassignProgram.bind(null, memberId)}
                title={t("coach.unassignConfirm")}
                confirmLabel={t("coach.unassign")}
                className={cn(btn.ghost, "text-berry-d")}
              >
                {t("coach.unassign")}
              </ConfirmActionButton>
            </div>
          ) : (
            <p className="text-sm text-muted">{t("coach.noProgram")}</p>
          )}
          {(myPrograms ?? []).length > 0 ? (
            <form action={assignProgram.bind(null, memberId)} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <select name="program_id" required className={input} defaultValue={program?.program.id}>
                {((myPrograms ?? []) as Program[]).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input type="date" name="start_date" required defaultValue={today} aria-label={t("coach.startDate")} className={input} />
              <button type="submit" className={cn(btn.primary, "h-auto min-h-12 text-base")}>
                {t("coach.assign")}
              </button>
            </form>
          ) : (
            <Link href="/coach/programs" className={cn(btn.small, "self-start border border-line")}>
              {t("programs.new")}
            </Link>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-[17px] font-semibold">{t("coach.targetsFor", { name })}</h2>
          <TargetsForm targets={targets} userId={memberId} />
        </Card>
      </div>
    );
  }
}

function MiniStat({ value, label, cls }: { value: string; label: string; cls: string }) {
  const [bg, fg] = cls.split(" ");
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-2xl p-2.5", bg)}>
      <span className={cn("font-display text-[22px] font-bold", fg)}>{value}</span>
      <span className="text-[11px] font-bold">{label}</span>
    </div>
  );
}
