import Link from "next/link";
import { Beru } from "@/components/Beru";
import { Icon } from "@/components/Icon";
import { MealPhoto } from "@/components/member/MealPhoto";
import { WaterCard } from "@/components/member/WaterCard";
import { NutritionSummary, TargetRings } from "@/components/member/widgets";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { RoleSwitch } from "@/components/shell/RoleSwitch";
import { Avatar, Card, Chip, IconButton, SectionTitle, SOLID } from "@/components/ui";
import { getActiveCoach, requireViewer } from "@/lib/auth";
import { formatClock, formatLongDate, hhmm, localParts, todayIn } from "@/lib/dates";
import { ensurePlanFromProgram, getActivity, getMealsForDay, getWater, sumNutrition } from "@/lib/data";
import { firstName, mealTypeForHour, MEAL_TYPES, relativeAgo, relativeUntil } from "@/lib/format";
import { makeT, type DictKey } from "@/lib/i18n";
import { nextOccurrence } from "@/lib/reminders";
import type { Reminder, Targets } from "@/lib/types";

export const metadata = { title: "Beranda" };

export default async function HomePage() {
  const viewer = await requireViewer("member");
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);
  const tz = profile.timezone;
  const today = todayIn(tz);
  const now = new Date();

  const [meals, water, plan, activity, targetsRes, remindersRes, coach, unreadNotif] = await Promise.all([
    getMealsForDay(supabase, userId, today, tz),
    getWater(supabase, userId, today),
    ensurePlanFromProgram(supabase, userId, today),
    getActivity(supabase, userId, tz, today, 60),
    supabase.from("targets").select("*").eq("user_id", userId).single(),
    supabase.from("reminders").select("*").eq("user_id", userId).eq("enabled", true),
    getActiveCoach(viewer),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
  ]);
  const targets = targetsRes.data as Targets;

  // Latest word from the coach: a chat message or a comment on a meal.
  let coachNote: { body: string; at: string } | null = null;
  if (coach) {
    const [{ data: msg }, { data: comment }] = await Promise.all([
      supabase
        .from("messages")
        .select("body, created_at")
        .eq("sender_id", coach.id)
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("meal_comments")
        .select("body, created_at, meals!inner(user_id)")
        .eq("author_id", coach.id)
        .eq("meals.user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const cands = [msg, comment].filter(Boolean) as { body: string; created_at: string }[];
    cands.sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (cands[0]) coachNote = { body: cands[0].body || t("chat.photoMsg"), at: cands[0].created_at };
  }

  const doneMinutes = plan.items.filter((i) => i.done_at).reduce((a, i) => a + i.minutes, 0);
  const openItems = plan.items.filter((i) => !i.done_at).length;
  const workoutGoal = Math.max(targets.workout_min, 1);
  const fr = {
    workout: doneMinutes / workoutGoal,
    meals: meals.length / Math.max(targets.meals, 1),
    water: water / Math.max(targets.water_glasses, 1),
  };
  const avg = (Math.min(fr.workout, 1) + Math.min(fr.meals, 1) + Math.min(fr.water, 1)) / 3;
  const allDone = avg >= 1;
  const badge = allDone ? t("home.allDone") : avg >= 0.6 ? t("home.almost") : avg > 0 ? t("home.onTrack") : t("home.letsGo");

  const heroTitle = allDone ? t("home.msgDone") : activity.current >= 2 ? t("home.msgGreat") : t("home.msgStart");
  const heroSub = allDone
    ? t("home.subDone")
    : openItems > 0
      ? t("home.subWorkoutLeft", { n: openItems })
      : plan.items.length === 0
        ? t("home.subNoPlan")
        : t("home.subDone");

  const next = nextOccurrence((remindersRes.data ?? []) as Reminder[], now, tz);
  const loggedTypes = new Set(meals.map((m) => m.meal_type));
  const suggestType = MEAL_TYPES.find((m) => !loggedTypes.has(m)) ?? mealTypeForHour(localParts(now, tz).hour);
  const nutrition = sumNutrition(meals);

  return (
    <div className="flex flex-col gap-[18px]">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-muted">{formatLongDate(today, profile.locale)}</span>
          <h1 className="truncate font-display text-[30px] leading-tight font-semibold">
            {t("home.hello", { name: firstName(profile.full_name) })}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {profile.is_coach && <RoleSwitch current="member" compact className="lg:hidden" />}
          {coach && <IconButton href="/chat" label={t("chat.title")} icon="chat" />}
          <IconButton href="/notifications" label={t("nav.notifications")} icon="bell" dot={!!unreadNotif.count} />
          <Link href="/profile" aria-label={t("nav.profile")} className="lg:hidden">
            <Avatar name={profile.full_name} src={profile.avatar_url} id={profile.id} size={44} />
          </Link>
        </div>
      </header>

      <InstallPrompt />

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        <div className="flex flex-col gap-[18px]">
          {/* Streak hero */}
          <div className="flex items-center gap-2 rounded-[28px] bg-sun-s py-3.5 pr-[18px] pl-2">
            <Beru pose={allDone ? "cheer" : "wave"} size={112} />
            <div className="flex flex-1 flex-col gap-1.5">
              {activity.current > 0 && (
                <span className="inline-flex items-center gap-1 self-start rounded-full bg-sun px-2.5 py-[5px] text-xs font-extrabold text-ink">
                  <Icon name="flame" size={14} />
                  {t("home.streak", { n: activity.current })}
                </span>
              )}
              <span className="font-display text-xl leading-tight font-semibold">{heroTitle}</span>
              <span className="text-[13px] leading-snug text-muted">{heroSub}</span>
            </div>
          </div>

          {/* Targets */}
          <Card className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[19px] font-semibold">{t("home.targets")}</h2>
              <Chip accent="grape">{badge}</Chip>
            </div>
            <div className="flex items-center gap-[18px]">
              <TargetRings workout={fr.workout} meals={fr.meals} water={fr.water} />
              <div className="flex flex-1 flex-col gap-3">
                <Legend dot="bg-grape" label={t("home.ringWorkout")} value={t("home.ofMinutes", { a: doneMinutes, b: targets.workout_min })} />
                <Legend dot="bg-mint" label={t("home.ringMeals")} value={t("home.ofTimes", { a: meals.length, b: targets.meals })} />
                <Legend dot="bg-sky" label={t("home.ringWater")} value={t("home.ofGlasses", { a: water, b: targets.water_glasses })} />
              </div>
            </div>
          </Card>

          {/* Next reminder */}
          <div className="flex items-center gap-3.5 rounded-[28px] bg-grape p-[18px] text-on-grape">
            <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] bg-card text-grape-d">
              <Icon name="bell" size={24} strokeWidth={2} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xs font-semibold">{t("home.nextReminder")}</span>
              {next ? (
                <>
                  <span className="truncate font-display text-[22px] font-semibold">
                    {hhmm(formatClock(next.at.toISOString(), tz, "en"))} · {next.reminder.label}
                  </span>
                  <span className="text-xs font-medium">{relativeUntil(next.minutesUntil, t)}</span>
                </>
              ) : (
                <span className="font-display text-lg font-semibold">{t("home.noReminder")}</span>
              )}
            </div>
            <Link href="/reminders" className="flex min-h-11 items-center rounded-[14px] bg-card px-4 text-[13px] font-bold text-text">
              {t("home.set")}
            </Link>
          </div>

          <WaterCard glasses={water} target={targets.water_glasses} />
        </div>

        <div className="flex flex-col gap-[18px]">
          {/* Meals today */}
          <section className="flex flex-col gap-2.5">
            <SectionTitle
              action={
                <Link href="/food" className="flex min-h-11 items-center text-[13px] font-bold text-mango-d">
                  {t("common.seeAll")}
                </Link>
              }
            >
              {t("home.mealsToday")}
            </SectionTitle>
            <div className="grid grid-cols-3 gap-2.5">
              {meals.slice(-2).map((m) => (
                <Link key={m.id} href="/food" className="flex flex-col gap-2 rounded-[22px] border border-line bg-card p-2">
                  <MealPhoto meal={m} className="h-[92px] w-full rounded-2xl" />
                  <div className="flex flex-col gap-0.5 px-1 pb-1">
                    <span className="truncate text-[13px] font-bold">{t(`meal.${m.meal_type}` as DictKey)}</span>
                    <span className="truncate text-[11px] font-semibold text-muted">
                      {formatClock(m.eaten_at, tz, profile.locale)}
                      {m.calories ? ` · ${m.calories} ${t("common.kcal")}` : m.caption ? ` · ${m.caption}` : ""}
                    </span>
                  </div>
                </Link>
              ))}
              <Link
                href={`/food/new?type=${suggestType}`}
                className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-line text-muted"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mango text-ink">
                  <Icon name="plus" size={20} strokeWidth={2.5} />
                </span>
                <span className="px-1 text-center text-xs leading-snug font-bold">
                  {t("home.postMeal", { meal: t(`meal.${suggestType}` as DictKey).toLowerCase() })}
                </span>
              </Link>
            </div>
          </section>

          <Card className="flex flex-col gap-3">
            <SectionTitle>{t("home.nutrition")}</SectionTitle>
            <NutritionSummary totals={nutrition} targets={targets} t={t} compact />
          </Card>

          {coach && (
            <Link href="/community" className="flex items-center gap-3 rounded-[24px] bg-mint-s p-4 text-mint-d">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-mint text-ink">
                <Icon name="members" size={22} />
              </span>
              <span className="flex-1 text-sm font-bold text-text">{t("community.see")}</span>
              <Icon name="chevron" size={18} />
            </Link>
          )}

          {/* Coach */}
          {coach ? (
            <Link href="/chat" className="flex gap-3 rounded-[24px] border border-line bg-card p-4">
              <Avatar name={coach.full_name} src={coach.avatar_url} accent="grape" size={40} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs font-semibold text-muted">
                  <strong className="text-text">
                    {t("common.coach")} {firstName(coach.full_name)}
                  </strong>
                  {coachNote && <> · {relativeAgo(coachNote.at, t)}</>}
                </span>
                <span className="line-clamp-3 text-sm leading-normal">{coachNote ? coachNote.body : t("home.openChat")}</span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3 rounded-[24px] bg-grape-s p-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${SOLID.grape}`}>
                <Icon name="members" size={22} />
              </span>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-bold">{t("home.noCoachTitle")}</span>
                <span className="text-xs text-muted">{t("home.noCoachBody")}</span>
              </div>
              <Link href="/profile#coach" className="flex min-h-11 items-center rounded-[14px] bg-card px-3.5 text-[13px] font-bold">
                {t("home.findCoach")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Legend({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-muted">{label}</span>
        <span className="text-[15px] font-bold">{value}</span>
      </div>
    </div>
  );
}
