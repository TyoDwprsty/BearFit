import Link from "next/link";
import { RequestActions } from "@/components/coach/RequestActions";
import { Icon } from "@/components/Icon";
import { InviteCard } from "@/components/profile/InviteCard";
import { RoleSwitch } from "@/components/shell/RoleSwitch";
import { Avatar, Card, cn, EmptyState, FilterChipLink, IconButton, SOFT } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { getCoachMembers, getMembersToday, memberDay } from "@/lib/coach";
import { formatLongDate, todayIn } from "@/lib/dates";
import { env } from "@/lib/env";
import { firstName, relativeAgo } from "@/lib/format";
import { makeT } from "@/lib/i18n";
import type { MemberProgram, Program, Targets } from "@/lib/types";

export const metadata = { title: "Dasbor Coach" };

type Filter = "all" | "check" | "worked";

export default async function CoachDashboard({ searchParams }: PageProps<"/coach">) {
  const viewer = await requireViewer("coach");
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);
  const sp = await searchParams;
  const filter: Filter = sp.filter === "check" || sp.filter === "worked" ? sp.filter : "all";

  const members = await getCoachMembers(supabase, userId);
  const ids = members.map((m) => m.id);
  const [today, pendingRes, programsRes, targetsRes, unreadNotif] = await Promise.all([
    getMembersToday(supabase, members),
    supabase.from("coach_links").select("id, member_id, created_at").eq("coach_id", userId).eq("status", "pending").order("created_at"),
    ids.length
      ? supabase.from("member_programs").select("*, programs(*)").eq("coach_id", userId).eq("active", true).in("member_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("targets").select("user_id, meals").in("user_id", ids) : Promise.resolve({ data: [] }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
  ]);

  const pending = pendingRes.data ?? [];
  const { data: pendingProfiles } = pending.length
    ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", pending.map((p) => p.member_id))
    : { data: [] };

  const programs = new Map(
    ((programsRes.data ?? []) as (MemberProgram & { programs: Program })[]).map((mp) => [mp.member_id, { assignment: mp, program: mp.programs }]),
  );
  const mealTargets = new Map(((targetsRes.data ?? []) as Pick<Targets, "user_id" | "meals">[]).map((x) => [x.user_id, x.meals]));

  const stats = {
    meals: [...today.values()].filter((s) => s.mealsToday > 0).length,
    worked: [...today.values()].filter((s) => s.itemsDone > 0).length,
    check: [...today.values()].filter((s) => s.needsCheck).length,
  };

  const visible = members.filter((m) => {
    const s = today.get(m.id);
    if (filter === "check") return s?.needsCheck;
    if (filter === "worked") return (s?.itemsDone ?? 0) > 0;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-muted">
            {formatLongDate(todayIn(profile.timezone), profile.locale)} · {t("coach.membersCount", { n: members.length })}
          </span>
          <h1 className="truncate font-display text-[28px] leading-tight font-semibold">{t("coach.hello", { name: firstName(profile.full_name) })}</h1>
        </div>
        <div className="flex items-center gap-2">
          {profile.is_member && <RoleSwitch current="coach" compact className="lg:hidden" />}
          <IconButton href="/notifications" label={t("nav.notifications")} icon="bell" dot={!!unreadNotif.count} />
          <Link href="/profile" className="lg:hidden" aria-label={t("nav.profile")}>
            <Avatar name={profile.full_name} src={profile.avatar_url} accent="grape" size={46} />
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        <StatTile value={`${stats.meals}/${members.length}`} label={t("coach.statMeals")} cls={SOFT.mint} />
        <StatTile value={`${stats.worked}/${members.length}`} label={t("coach.statWorkout")} cls={SOFT.grape} />
        <StatTile value={String(stats.check)} label={t("coach.statCheck")} cls={SOFT.berry} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex flex-col gap-3">
          {pending.length > 0 && (
            <Card className="flex flex-col gap-2.5 border-sun bg-sun-s">
              <h2 className="font-display text-[17px] font-semibold">{t("coach.requests")}</h2>
              {pending.map((p) => {
                const who = pendingProfiles?.find((x) => x.id === p.member_id);
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <Avatar name={who?.full_name} src={who?.avatar_url} id={p.member_id} size={40} />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{who?.full_name}</span>
                    <RequestActions linkId={p.id} />
                  </div>
                );
              })}
            </Card>
          )}

          <h2 className="font-display text-[19px] font-semibold">{t("coach.members")}</h2>
          <div className="flex flex-wrap gap-2">
            <FilterChipLink href="/coach" active={filter === "all"}>
              {t("coach.filter.all")}
            </FilterChipLink>
            <FilterChipLink href="/coach?filter=check" active={filter === "check"}>
              {t("coach.filter.check")}
            </FilterChipLink>
            <FilterChipLink href="/coach?filter=worked" active={filter === "worked"}>
              {t("coach.filter.worked")}
            </FilterChipLink>
          </div>

          {members.length === 0 ? (
            <EmptyState text={t("coach.noMembers")} />
          ) : (
            <div className="grid gap-2.5 xl:grid-cols-2">
              {visible.map((m) => {
                const s = today.get(m.id)!;
                const mealsTarget = mealTargets.get(m.id) ?? 4;
                const d = memberDay(m.since, m.timezone, programs.get(m.id) ?? null);
                const statusText =
                  s.status === "done"
                    ? t("coach.status.done")
                    : s.status === "partial"
                      ? t("coach.status.partial", { a: s.itemsDone, b: s.itemsTotal })
                      : s.status === "mealsOnly"
                        ? t("coach.status.mealsOnly")
                        : s.status === "noPlan"
                          ? t("coach.status.noPlan")
                          : t("coach.status.none");
                const statusCls = s.needsCheck ? "bg-card text-berry-d" : s.status === "done" ? SOFT.mint : SOFT.sun;
                return (
                  <Link
                    key={m.id}
                    href={`/coach/members/${m.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-[22px] border-[1.5px] p-3.5 transition active:scale-[0.99]",
                      s.needsCheck ? "border-berry bg-berry-s" : "border-line bg-card",
                    )}
                  >
                    <Avatar name={m.full_name} src={m.avatar_url} id={m.id} size={48} />
                    <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
                      <span className="flex items-baseline gap-1.5">
                        <span className="truncate text-[15px] font-extrabold">{m.full_name}</span>
                        <span className="shrink-0 text-xs font-semibold text-muted">{t("common.day", { n: d.day })}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        {Array.from({ length: mealsTarget }, (_, i) => (
                          <span key={i} className={cn("h-2.5 w-2.5 rounded-full", i < s.mealsToday ? "bg-mint" : "bg-line")} />
                        ))}
                        <span className="ml-1 text-xs font-semibold text-muted">{t("coach.mealsTxt", { n: s.mealsToday, t: mealsTarget })}</span>
                      </span>
                      <span className={cn("self-start rounded-full px-[9px] py-1 text-[11px] font-extrabold", statusCls)}>{statusText}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-2.5 text-muted">
                      <span className="text-[11px] font-semibold">{s.lastActivity ? relativeAgo(s.lastActivity, t) : "—"}</span>
                      <Icon name="chevron" size={18} strokeWidth={2.4} />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:sticky lg:top-10">
          {profile.coach_code && <InviteCard code={profile.coach_code} appUrl={env.appUrl} />}
        </div>
      </div>
    </div>
  );
}

function StatTile({ value, label, cls }: { value: string; label: string; cls: string }) {
  const [bg, fg] = cls.split(" ");
  return (
    <div className={cn("flex flex-col gap-1 rounded-[22px] px-3 py-3.5", bg)}>
      <span className={cn("font-display text-[28px] leading-none font-bold", fg)}>{value}</span>
      <span className="text-xs leading-snug font-bold text-text">{label}</span>
    </div>
  );
}
