import { cookies } from "next/headers";
import { enableRole, updateProfileBasics } from "@/app/actions/preferences";
import { SubmitButton } from "@/components/feedback/SubmitButton";
import { Icon } from "@/components/Icon";
import { LocaleToggle } from "@/components/LocaleToggle";
import { CoachConnect, LeaveCoachButton } from "@/components/profile/CoachConnect";
import { InviteCard } from "@/components/profile/InviteCard";
import { TargetsForm } from "@/components/profile/TargetsForm";
import { ThemeToggle } from "@/components/profile/ThemeToggle";
import { InstallRow } from "@/components/pwa/InstallPrompt";
import { PushToggle } from "@/components/pwa/PushToggle";
import { RoleSwitch } from "@/components/shell/RoleSwitch";
import { Avatar, btn, Card, Chip, cn, input, SectionTitle } from "@/components/ui";
import { getActiveCoach, requireViewer } from "@/lib/auth";
import { formatShortDate, localDateOf } from "@/lib/dates";
import { makeT } from "@/lib/i18n";
import { normalizeTheme, THEME_COOKIE } from "@/lib/theme";
import type { Targets } from "@/lib/types";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const viewer = await requireViewer();
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);
  const theme = normalizeTheme((await cookies()).get(THEME_COOKIE)?.value);
  const mode = profile.active_role ?? (profile.is_member ? "member" : "coach");

  const [coach, pendingRes, targetsRes] = await Promise.all([
    profile.is_member ? getActiveCoach(viewer) : Promise.resolve(null),
    profile.is_member
      ? supabase.from("coach_links").select("id, coach_id").eq("member_id", userId).eq("status", "pending")
      : Promise.resolve({ data: [] as { id: string; coach_id: string }[] }),
    profile.is_member ? supabase.from("targets").select("*").eq("user_id", userId).single() : Promise.resolve({ data: null }),
  ]);

  const pendingRows = (pendingRes.data ?? []) as { id: string; coach_id: string }[];
  const { data: pendingCoaches } = pendingRows.length
    ? await supabase.from("profiles").select("id, full_name, avatar_url, coach_bio").in("id", pendingRows.map((p) => p.coach_id))
    : { data: [] };
  const pending = pendingRows
    .map((p) => ({ linkId: p.id, coach: (pendingCoaches ?? []).find((c) => c.id === p.coach_id) }))
    .filter((p): p is { linkId: string; coach: NonNullable<typeof p.coach> } => !!p.coach);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-[30px] font-semibold">{t("profile.title")}</h1>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-4">
            <div className="flex items-center gap-3.5">
              <Avatar name={profile.full_name} src={profile.avatar_url} id={profile.id} size={64} />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate font-display text-[22px] font-semibold">{profile.full_name}</span>
                <span className="truncate text-[13px] text-muted">{profile.email}</span>
                <div className="flex gap-1.5">
                  {profile.is_member && <Chip accent="mango">{t("common.member")}</Chip>}
                  {profile.is_coach && <Chip accent="grape">{t("common.coach")}</Chip>}
                </div>
              </div>
            </div>
            <form action={updateProfileBasics} className="flex flex-col gap-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">{t("onb.name")}</span>
                <input name="full_name" defaultValue={profile.full_name} maxLength={80} required className={input} />
              </label>
              {profile.is_coach && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold">{t("profile.bio")}</span>
                  <textarea name="coach_bio" rows={2} defaultValue={profile.coach_bio ?? ""} maxLength={240} placeholder={t("onb.coachBioPh")} className={cn(input, "resize-none")} />
                </label>
              )}
              <SubmitButton className={cn(btn.small, "self-start border border-line")}>
                {t("common.save")}
              </SubmitButton>
            </form>
          </Card>

          <Card className="flex flex-col gap-3">
            <SectionTitle>{t("profile.roles")}</SectionTitle>
            {profile.is_member && profile.is_coach ? (
              <RoleSwitch current={mode} className="self-start" />
            ) : (
              <form action={enableRole.bind(null, profile.is_coach ? "member" : "coach")}>
                <SubmitButton page className={cn(btn.small, "border border-line")}>
                  <Icon name="swap" size={16} />
                  {profile.is_coach ? t("profile.enableMember") : t("profile.enableCoach")}
                </SubmitButton>
              </form>
            )}
          </Card>

          {profile.is_coach && profile.coach_code && <InviteCard code={profile.coach_code} />}

          {profile.is_member && (
            <Card className="flex flex-col gap-3">
              <div id="coach" className="scroll-mt-6" />
              <SectionTitle>{t("profile.myCoach")}</SectionTitle>
              {coach ? (
                <div className="flex items-center gap-3 rounded-[20px] bg-grape-s p-3">
                  <Avatar name={coach.full_name} src={coach.avatar_url} accent="grape" size={48} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-bold">{coach.full_name}</span>
                    <span className="text-xs text-muted">
                      {t("profile.since", { date: formatShortDate(localDateOf(coach.since, profile.timezone), profile.locale) })}
                    </span>
                  </div>
                  <LeaveCoachButton linkId={coach.linkId} />
                </div>
              ) : (
                <CoachConnect pending={pending} />
              )}
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {profile.is_member && targetsRes.data && (
            <Card className="flex flex-col gap-3">
              <SectionTitle>{t("profile.targets")}</SectionTitle>
              <TargetsForm targets={targetsRes.data as Targets} />
            </Card>
          )}

          <Card className="flex flex-col gap-4">
            <SectionTitle>{t("profile.prefs")}</SectionTitle>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold">{t("profile.language")}</span>
              <LocaleToggle className="border border-line" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold">{t("profile.theme")}</span>
              <ThemeToggle current={theme} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold">{t("profile.notifications")}</span>
              <PushToggle />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold">{t("profile.install")}</span>
              <InstallRow />
            </div>
          </Card>

          <form action="/auth/signout" method="post">
            <button type="submit" className={cn(btn.outline, "w-full text-berry-d")}>
              <Icon name="logout" size={20} />
              {t("profile.logout")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
