import { BarChart, LineChart } from "@/components/charts";
import { Icon, type IconName } from "@/components/Icon";
import { WeightForm } from "@/components/member/WeightForm";
import { Card, Chip, cn, SegmentedLinks, SOLID } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { addDays, diffDays, localDateOf, rangeUtc, todayIn, weekStart, weekdayShort } from "@/lib/dates";
import { getActivity } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import type { Targets, WeightLog } from "@/lib/types";

export const metadata = { title: "Progres" };

export default async function ProgressPage({ searchParams }: PageProps<"/progress">) {
  const viewer = await requireViewer("member");
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);
  const tz = profile.timezone;
  const today = todayIn(tz);
  const range = (await searchParams).range === "month" ? "month" : "week";

  const monday = weekStart(today);
  const periodStart = range === "week" ? monday : addDays(monday, -21);
  const [kFrom, kTo] = rangeUtc(periodStart, addDays(monday, 7), tz);

  const [activity, weightsRes, mealsRes, targetsRes] = await Promise.all([
    getActivity(supabase, userId, tz, today, 180),
    supabase.from("weight_logs").select("*").eq("user_id", userId).order("log_date", { ascending: false }).limit(10),
    supabase.from("meals").select("eaten_at, calories").eq("user_id", userId).gte("eaten_at", kFrom).lt("eaten_at", kTo),
    supabase.from("targets").select("*").eq("user_id", userId).single(),
  ]);
  const targets = targetsRes.data as Targets;
  const weights = ((weightsRes.data ?? []) as WeightLog[]).reverse();

  const kcalByDate = new Map<string, number>();
  for (const m of mealsRes.data ?? []) {
    const d = localDateOf(m.eaten_at, tz);
    kcalByDate.set(d, (kcalByDate.get(d) ?? 0) + (m.calories ?? 0));
  }

  // Bars
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  let minuteBars: { label: string; value: number; highlight?: boolean }[];
  let kcalBars: { label: string; value: number; highlight?: boolean }[];
  if (range === "week") {
    minuteBars = weekDays.map((d) => ({ label: weekdayShort(d, profile.locale), value: activity.minutesByDate.get(d) ?? 0, highlight: d === today }));
    kcalBars = weekDays.map((d) => ({ label: weekdayShort(d, profile.locale), value: kcalByDate.get(d) ?? 0, highlight: d === today }));
  } else {
    const weeks = [3, 2, 1, 0].map((back) => addDays(monday, -7 * back));
    const sumWeek = (start: string, map: Map<string, number>) =>
      Array.from({ length: 7 }, (_, i) => map.get(addDays(start, i)) ?? 0).reduce((a, b) => a + b, 0);
    minuteBars = weeks.map((w, i) => ({ label: t("progress.weekN", { n: i + 1 }), value: sumWeek(w, activity.minutesByDate), highlight: i === 3 }));
    kcalBars = weeks.map((w, i) => {
      const days = Array.from({ length: 7 }, (_, j) => addDays(w, j)).filter((d) => d <= today && kcalByDate.has(d)).length;
      return { label: t("progress.weekN", { n: i + 1 }), value: days ? sumWeek(w, kcalByDate) / days : 0, highlight: i === 3 };
    });
  }
  const totalMinutes = minuteBars.reduce((a, b) => a + b.value, 0);
  const loggedKcalDays = [...kcalByDate.entries()].filter(([d, v]) => d >= periodStart && v > 0);
  const avgKcal = loggedKcalDays.length ? Math.round(loggedKcalDays.reduce((a, [, v]) => a + v, 0) / loggedKcalDays.length) : 0;

  // Weight
  const latest = weights.at(-1);
  const first = weights[0];
  const delta = latest && first ? Math.round((Number(latest.weight_kg) - Number(first.weight_kg)) * 10) / 10 : 0;
  const deltaWeeks = latest && first ? Math.max(1, Math.round(diffDays(latest.log_date, first.log_date) / 7)) : 0;
  const fmtKg = (n: number) => n.toLocaleString(profile.locale === "en" ? "en-GB" : "id-ID", { maximumFractionDigits: 1 });

  const badges: { label: string; icon: IconName; on: boolean; cls: string }[] = [
    { label: t("badge.early"), icon: "sun", on: activity.earlyWorkouts >= 5, cls: SOLID.sun },
    { label: t("badge.veggie"), icon: "stretch", on: activity.veggieMeals >= 10, cls: SOLID.mint },
    { label: t("badge.streak7"), icon: "flame", on: activity.best >= 7, cls: SOLID.berry },
    { label: t("badge.streak30"), icon: "lock", on: activity.best >= 30, cls: SOLID.grape },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-display text-[30px] font-semibold">{t("progress.title")}</h1>
        <SegmentedLinks
          items={[
            { href: "/progress?range=week", label: t("progress.week"), active: range === "week" },
            { href: "/progress?range=month", label: t("progress.month"), active: range === "month" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Streak */}
        <section className="flex flex-col gap-4 rounded-[28px] bg-berry-s p-[18px]">
          <div className="flex items-center gap-3.5">
            <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px]", SOLID.berry)}>
              <Icon name="flame" size={28} />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-[34px] leading-tight font-bold">{t("progress.streakDays", { n: activity.current })}</span>
              <span className="text-[13px] font-semibold text-muted">{t("progress.streakSub", { n: activity.best })}</span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((d) => {
              const done = activity.activeDates.has(d);
              const future = d > today;
              return (
                <div key={d} className="flex flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 text-ink",
                      done ? "border-berry bg-berry" : future ? "border-line" : "border-berry",
                    )}
                  >
                    {done && <Icon name="check" size={16} strokeWidth={3.2} />}
                  </span>
                  <span className="text-[11px] font-bold text-muted">{weekdayShort(d, profile.locale).charAt(0)}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Minutes */}
        <Card className="flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[19px] font-semibold">{t("progress.minutes")}</h2>
            <span className="font-display text-[22px] font-semibold text-grape-d">{t("progress.totalMin", { n: totalMinutes })}</span>
          </div>
          <BarChart bars={minuteBars} />
        </Card>

        {/* Calories */}
        <Card className="flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[19px] font-semibold">{t("progress.kcal")}</h2>
            <span className="text-sm font-bold text-mango-d">{t("progress.avgKcal", { n: avgKcal })}</span>
          </div>
          <BarChart bars={kcalBars} barClass="bg-mint" highlightClass="bg-mango" targetLine={targets.kcal} />
        </Card>

        {/* Weight */}
        <Card className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-display text-[19px] font-semibold">{t("progress.weight")}</h2>
              {latest && <span className="font-display text-[28px] font-semibold">{fmtKg(Number(latest.weight_kg))} kg</span>}
            </div>
            {weights.length > 1 && (
              <Chip accent={delta <= 0 ? "mint" : "berry"} className="font-extrabold">
                {t("progress.weightDelta", { d: `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${fmtKg(Math.abs(delta))}`, w: deltaWeeks })}
              </Chip>
            )}
          </div>
          {weights.length > 0 ? (
            <>
              <LineChart values={weights.map((w) => Number(w.weight_kg))} label={t("progress.weight")} />
              <div className="flex justify-between text-[11px] font-bold text-muted">
                <span>{first && t("progress.weeksAgo", { n: Math.max(0, Math.round(diffDays(today, first.log_date) / 7)) })}</span>
                <span>{t("progress.today")}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">{t("progress.noWeight")}</p>
          )}
          <WeightForm />
        </Card>
      </div>

      <section className="flex flex-col gap-2.5">
        <h2 className="font-display text-[19px] font-semibold">{t("progress.badges")}</h2>
        <div className="grid grid-cols-4 gap-2.5">
          {badges.map((b) => (
            <div key={b.label} className="flex flex-col items-center gap-2 rounded-[20px] border border-line bg-card px-1.5 py-3">
              <span className={cn("flex h-[50px] w-[50px] items-center justify-center rounded-full", b.on ? b.cls : "bg-soft text-muted")}>
                <Icon name={b.on ? b.icon : "lock"} size={24} />
              </span>
              <span className={cn("text-center text-[11px] leading-tight font-bold", !b.on && "text-muted")}>{b.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
