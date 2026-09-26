import Link from "next/link";
import { DatePickerButton } from "@/components/DatePickerButton";
import { Icon } from "@/components/Icon";
import { MealPost } from "@/components/member/MealPost";
import { Avatar, btn, Card, EmptyState, PageTitle, ProgressBar, SectionTitle, SegmentedLinks } from "@/components/ui";
import { getActiveCoach, requireViewer } from "@/lib/auth";
import { addDays, dayRangeUtc, formatLongDate, isValidDateStr, todayIn } from "@/lib/dates";
import { firstName } from "@/lib/format";
import { makeT } from "@/lib/i18n";
import { hydrateMeals } from "@/lib/meal-posts";
import type { Meal, ProfileLite, WorkoutItem } from "@/lib/types";

export const metadata = { title: "Komunitas" };

/** Everyone coached by the same coach: shared meals + workout progress for a day. */
export default async function CommunityPage({ searchParams }: PageProps<"/community">) {
  const viewer = await requireViewer("member");
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);
  const tz = profile.timezone;
  const today = todayIn(tz);
  const sp = await searchParams;
  const date = isValidDateStr(sp.date as string) && (sp.date as string) <= today ? (sp.date as string) : today;

  const tabs = (
    <SegmentedLinks
      items={[
        { href: "/food", label: t("community.tabMine"), active: false },
        { href: "/community", label: t("community.tabCommunity"), active: true },
      ]}
    />
  );

  const coach = await getActiveCoach(viewer);
  if (!coach) {
    return (
      <div className="flex flex-col gap-4">
        {tabs}
        <PageTitle title={t("community.title")} />
        <EmptyState
          text={t("community.noCoach")}
          action={
            <Link href="/profile#coach" className={btn.primary}>
              {t("home.findCoach")}
            </Link>
          }
        />
      </div>
    );
  }

  const [from, to] = dayRangeUtc(date, tz);
  const { data: roster } = await supabase.rpc("community_members");
  const members = (roster ?? []) as ProfileLite[];
  const ids = members.map((m) => m.id);

  const [{ data: mealRows }, { data: planRows }] = await Promise.all([
    supabase
      .from("meals")
      .select("*")
      .in("user_id", ids.length ? ids : [userId])
      .eq("share_with_coach", true)
      .gte("eaten_at", from)
      .lt("eaten_at", to)
      .order("eaten_at", { ascending: false }),
    supabase
      .from("workout_plans")
      .select("member_id, workout_items(minutes, done_at)")
      .in("member_id", ids.length ? ids : [userId])
      .eq("plan_date", date),
  ]);
  const meals = (mealRows ?? []) as Meal[];
  const plans = (planRows ?? []) as { member_id: string; workout_items: Pick<WorkoutItem, "minutes" | "done_at">[] }[];
  const { posts, people } = await hydrateMeals(supabase, meals, [coach.id, ...ids]);

  const progress = members
    .map((m) => {
      const items = plans.find((p) => p.member_id === m.id)?.workout_items ?? [];
      const done = items.filter((i) => i.done_at);
      return {
        member: m,
        total: items.length,
        done: done.length,
        minutes: done.reduce((a, i) => a + i.minutes, 0),
        meals: meals.filter((x) => x.user_id === m.id).length,
      };
    })
    .sort((a, b) => b.done - a.done || b.meals - a.meals);

  return (
    <div className="flex flex-col gap-4">
      {tabs}
      <PageTitle
        eyebrow={t("community.team", { name: `${t("common.coach")} ${firstName(coach.full_name)}`, n: members.length })}
        title={t("community.title")}
        actions={
          <div className="flex gap-1.5">
            <Link href={`/community?date=${addDays(date, -1)}`} replace aria-label="←" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card">
              <Icon name="back" size={20} />
            </Link>
            {date < today && (
              <Link href={`/community?date=${addDays(date, 1)}`} replace aria-label="→" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card">
                <Icon name="chevron" size={20} />
              </Link>
            )}
            <DatePickerButton value={date} max={today} label={t("food.openCalendar")} />
          </div>
        }
      />
      <p className="-mt-2 text-sm font-bold text-grape-d">{date === today ? t("common.today") : formatLongDate(date, profile.locale)}</p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="flex flex-col gap-3 lg:order-2 lg:sticky lg:top-10">
          <SectionTitle>{t("community.progress")}</SectionTitle>
          <Card className="flex flex-col gap-3.5 p-4">
            {progress.map((p) => (
              <div key={p.member.id} className="flex items-center gap-3">
                <Avatar name={p.member.full_name} src={p.member.avatar_url} id={p.member.id} size={40} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-bold">
                      {p.member.full_name} {p.member.id === userId && <span className="font-semibold text-muted">{t("community.you")}</span>}
                    </span>
                    <span className="shrink-0 text-xs font-extrabold text-grape-d">
                      {p.total ? `${p.done}/${p.total}` : "–"}
                    </span>
                  </div>
                  <ProgressBar value={p.done} max={Math.max(1, p.total)} barClass={p.total && p.done === p.total ? "bg-mint" : "bg-grape"} />
                  <span className="text-[11px] font-semibold text-muted">
                    {p.total ? t("common.minutes", { n: p.minutes }) : t("community.noPlan")} · {t("community.mealsN", { n: p.meals })}
                  </span>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:order-1">
          <SectionTitle>{t("community.meals")}</SectionTitle>
          {posts.length === 0 ? (
            <EmptyState pose="eat" text={t("community.noPosts")} />
          ) : (
            posts.map((p) => (
              <MealPost
                key={p.meal.id}
                data={p}
                owner={people.get(p.meal.user_id) ?? { id: p.meal.user_id, full_name: "", avatar_url: null }}
                viewerId={userId}
                people={people}
                coachId={coach.id}
                t={t}
                tz={tz}
                locale={profile.locale}
                showOwner
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
