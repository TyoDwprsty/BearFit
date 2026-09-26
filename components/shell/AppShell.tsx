import Link from "next/link";
import { Beru } from "@/components/Beru";
import { Avatar } from "@/components/ui";
import { AlarmWatcher } from "@/components/pwa/AlarmWatcher";
import type { Viewer } from "@/lib/auth";
import { makeT } from "@/lib/i18n";
import type { Reminder, Role } from "@/lib/types";
import { BottomNav, SideNavLinks } from "./NavLinks";
import { RoleSwitch } from "./RoleSwitch";

/**
 * Mobile-first frame: single column + bottom nav on phones,
 * left sidebar + wide content on desktop (lg ≥ 1024px).
 */
export async function AppShell({
  viewer,
  mode,
  children,
}: {
  viewer: Viewer;
  mode: Role;
  children: React.ReactNode;
}) {
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);

  const [{ count: unreadMessages }, reminders] = await Promise.all([
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", userId).is("read_at", null),
    mode === "member"
      ? supabase.from("reminders").select("*").eq("user_id", userId).eq("enabled", true).then((r) => (r.data ?? []) as Reminder[])
      : Promise.resolve([] as Reminder[]),
  ]);

  const badges: Record<string, number> = {};
  if (mode === "coach" && unreadMessages) badges["/coach/chat"] = unreadMessages;

  const both = profile.is_member && profile.is_coach;

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col gap-6 border-r border-line bg-card px-4 py-6 lg:flex">
        <Link href={mode === "coach" ? "/coach" : "/home"} className="flex items-center gap-2 px-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sun">
            <Beru pose="wave" size={44} />
          </span>
          <span className="flex flex-col">
            <span className="font-display text-2xl leading-none font-bold">{t("app.name")}</span>
            <span className="text-xs font-bold text-muted">{mode === "coach" ? t("common.coach") : t("common.member")}</span>
          </span>
        </Link>
        <SideNavLinks mode={mode} badges={badges} />
        <div className="mt-auto flex flex-col gap-2">
          {both && <RoleSwitch current={mode} className="w-full" />}
          <Link href="/profile" className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-soft">
            <Avatar name={profile.full_name} src={profile.avatar_url} id={profile.id} size={40} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold">{profile.full_name}</span>
              <span className="truncate text-xs text-muted">{profile.email}</span>
            </span>
          </Link>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-xl px-5 pt-6 pb-36 lg:ml-[260px] lg:max-w-none lg:px-10 lg:pt-10 lg:pb-16">
        <div className="mx-auto w-full lg:max-w-5xl">{children}</div>
      </main>

      <BottomNav mode={mode} badges={badges} />
      {mode === "member" && <AlarmWatcher reminders={reminders} timezone={profile.timezone} />}
    </div>
  );
}
