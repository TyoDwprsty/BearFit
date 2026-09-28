import Link from "next/link";
import { DatePickerButton } from "@/components/DatePickerButton";
import { Icon } from "@/components/Icon";
import { WeekStrip, type DayMark } from "@/components/WeekStrip";
import { MealPost } from "@/components/member/MealPost";
import { NutritionSummary } from "@/components/member/widgets";
import { Card, cn, EmptyState, PageTitle, SegmentedLinks, btn } from "@/components/ui";
import { getActiveCoach, requireViewer } from "@/lib/auth";
import { addDays, formatLongDate, isValidDateStr, localDateOf, rangeUtc, todayIn, weekStart } from "@/lib/dates";
import { getActiveProgram, getMealsForDay, programDay, sumNutrition } from "@/lib/data";
import { MEAL_TYPES } from "@/lib/format";
import { makeT, type DictKey } from "@/lib/i18n";
import { hydrateMeals } from "@/lib/meal-posts";
import type { Targets } from "@/lib/types";

export const metadata = { title: "Catatan Makan" };

const MEAL_ICON = { breakfast: "sun", lunch: "food", dinner: "moon", snack: "sparkle" } as const;

export default async function FoodPage({ searchParams }: PageProps<"/food">) {
  const viewer = await requireViewer("member");
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);
  const tz = profile.timezone;
  const today = todayIn(tz);
  const params = await searchParams;
  const date = isValidDateStr(params.date as string) && (params.date as string) <= today ? (params.date as string) : today;

  const monday = weekStart(date);
  const [wFrom, wTo] = rangeUtc(monday, addDays(monday, 7), tz);

  const [meals, weekMeals, coach, program, targetsRes] = await Promise.all([
    getMealsForDay(supabase, userId, date, tz),
    supabase.from("meals").select("eaten_at").eq("user_id", userId).gte("eaten_at", wFrom).lt("eaten_at", wTo),
    getActiveCoach(viewer),
    getActiveProgram(supabase, userId),
    supabase.from("targets").select("*").eq("user_id", userId).single(),
  ]);
  const targets = targetsRes.data as Targets;
  const marks: Record<string, DayMark> = {};
  for (const m of weekMeals.data ?? []) marks[localDateOf(m.eaten_at, tz)] = "done";
  const { posts, people } = await hydrateMeals(supabase, [...meals].reverse(), coach ? [coach.id] : []);
  const logged = new Set(meals.map((m) => m.meal_type));

  const pDay = program ? programDay(program.assignment, program.program, date) : null;
  const eyebrow = pDay ? t("food.programWeek", { n: Math.ceil(pDay / 7) }) : formatLongDate(date, profile.locale);

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <div className="flex flex-col gap-4">
      <SegmentedLinks
        items={[
          { href: "/food", label: t("community.tabMine"), active: true },
          { href: `/community${date !== today ? `?date=${date}` : ""}`, label: t("community.tabCommunity"), active: false },
        ]}
      />
      <PageTitle eyebrow={eyebrow} title={t("food.title")} actions={<DatePickerButton value={date} max={today} label={t("food.openCalendar")} />} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex flex-col gap-4 lg:order-2 lg:sticky lg:top-10">
          {/* Week strip */}
          <WeekStrip days={days} selected={date} hrefFor={(d) => `/food?date=${d}`} locale={profile.locale} marks={marks} maxDate={today} />

          {/* Meal type status */}
          <div className="grid grid-cols-4 gap-2">
            {MEAL_TYPES.map((mt) => {
              const done = logged.has(mt);
              return (
                <Link
                  key={mt}
                  href={done ? "#" : `/food/new?type=${mt}${date !== today ? `&date=${date}` : ""}`}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl px-1.5 py-2.5",
                    done ? "bg-mint-s text-mint-d" : "border-[1.5px] border-dashed border-line text-muted",
                  )}
                >
                  <Icon name={done ? "check" : MEAL_ICON[mt]} size={18} strokeWidth={done ? 3 : 2} />
                  <span className="text-[11px] font-bold">{t(`meal.short.${mt}` as DictKey)}</span>
                </Link>
              );
            })}
          </div>

          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-[17px] font-semibold">{t("home.nutrition")}</h2>
            <NutritionSummary totals={sumNutrition(meals)} targets={targets} t={t} compact />
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:order-1">
          {posts.length === 0 ? (
            <EmptyState
              pose="eat"
              text={t("food.empty")}
              action={
                <Link href={`/food/new${date !== today ? `?date=${date}` : ""}`} className={cn(btn.mango, "h-12 text-base")}>
                  {t("food.emptyCta")}
                </Link>
              }
            />
          ) : (
            posts.map((p) => (
              <MealPost
                key={p.meal.id}
                data={p}
                owner={people.get(userId) ?? { id: userId, full_name: profile.full_name, avatar_url: profile.avatar_url }}
                viewerId={userId}
                people={people}
                coachId={coach?.id ?? null}
                t={t}
                tz={tz}
                locale={profile.locale}
              />
            ))
          )}
        </div>
      </div>

      <Link
        href={`/food/new${date !== today ? `?date=${date}` : ""}`}
        aria-label={t("food.newPost")}
        className="fixed right-5 bottom-[106px] z-30 flex h-[62px] w-[62px] items-center justify-center rounded-[22px] bg-mango text-ink shadow-[0_10px_24px_rgba(255,138,61,0.35)] transition active:scale-95 lg:right-10 lg:bottom-10"
      >
        <Icon name="plus" size={26} strokeWidth={2.6} />
      </Link>
    </div>
  );
}
