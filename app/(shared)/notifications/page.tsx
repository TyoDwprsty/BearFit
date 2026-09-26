import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { BackHeader, cn, EmptyState } from "@/components/ui";
import { homeFor, requireViewer } from "@/lib/auth";
import { relativeAgo } from "@/lib/format";
import { makeT } from "@/lib/i18n";
import type { AppNotification } from "@/lib/types";

export const metadata = { title: "Notifikasi" };

const KIND_ICON: Record<string, { icon: IconName; cls: string }> = {
  comment: { icon: "chat", cls: "bg-grape-s text-grape-d" },
  like: { icon: "heart", cls: "bg-berry-s text-berry-d" },
  message: { icon: "chat", cls: "bg-sky-s text-sky-d" },
  linkRequest: { icon: "members", cls: "bg-sun-s text-sun-d" },
  linkAccepted: { icon: "check", cls: "bg-mint-s text-mint-d" },
  joined: { icon: "members", cls: "bg-mint-s text-mint-d" },
  plan: { icon: "workout", cls: "bg-grape-s text-grape-d" },
};

export default async function NotificationsPage() {
  const viewer = await requireViewer();
  const t = makeT(viewer.profile.locale);
  const { data } = await viewer.supabase
    .from("notifications")
    .select("*")
    .eq("user_id", viewer.userId)
    .order("created_at", { ascending: false })
    .limit(60);
  const items = (data ?? []) as AppNotification[];
  // Opening the list marks everything as read (items above keep their highlight for this visit).
  if (items.some((n) => !n.read_at)) {
    await viewer.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", viewer.userId).is("read_at", null);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <BackHeader href={homeFor(viewer.profile)} backLabel={t("common.back")} title={t("notif.title")} />
      {items.length === 0 ? (
        <EmptyState pose="alarm" text={t("notif.empty")} />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => {
            const k = KIND_ICON[n.kind] ?? { icon: "bell" as IconName, cls: "bg-soft text-muted" };
            return (
              <li key={n.id}>
                <Link
                  href={n.url ?? "#"}
                  className={cn("flex items-start gap-3 rounded-[22px] border p-3.5", n.read_at ? "border-line bg-card" : "border-grape bg-grape-s/60")}
                >
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]", k.cls)}>
                    <Icon name={k.icon} size={20} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-bold">{n.title}</span>
                    {n.body && <span className="line-clamp-2 text-[13px] text-muted">{n.body}</span>}
                    <span className="text-[11px] font-semibold text-muted">{relativeAgo(n.created_at, t)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
