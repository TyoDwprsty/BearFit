import Link from "next/link";
import { Avatar, EmptyState, PageTitle } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { getCoachMembers } from "@/lib/coach";
import { relativeAgo } from "@/lib/format";
import { makeT } from "@/lib/i18n";
import type { Message } from "@/lib/types";

export const metadata = { title: "Pesan" };

export default async function CoachChatList() {
  const viewer = await requireViewer("coach");
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);
  const members = await getCoachMembers(supabase, userId);

  const { data } = members.length
    ? await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(300)
    : { data: [] };
  const messages = (data ?? []) as Message[];

  const rows = members
    .map((m) => {
      const thread = messages.filter((x) => x.sender_id === m.id || x.recipient_id === m.id);
      return {
        member: m,
        last: thread[0] ?? null,
        unread: thread.filter((x) => x.sender_id === m.id && !x.read_at).length,
      };
    })
    .sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <PageTitle title={t("chat.title")} />
      {rows.length === 0 ? (
        <EmptyState text={t("chat.noMembers")} />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ member, last, unread }) => (
            <li key={member.id}>
              <Link href={`/coach/chat/${member.id}`} className="flex items-center gap-3 rounded-[22px] border border-line bg-card p-3.5">
                <Avatar name={member.full_name} src={member.avatar_url} id={member.id} size={48} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-extrabold">{member.full_name}</span>
                  <span className="truncate text-[13px] text-muted">
                    {last ? `${last.sender_id === userId ? `${t("chat.you")}: ` : ""}${last.body || t("chat.photoMsg")}` : t("chat.empty")}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {last && <span className="text-[11px] font-semibold text-muted">{relativeAgo(last.created_at, t)}</span>}
                  {unread > 0 && (
                    <span className="min-w-5 rounded-full bg-berry px-1.5 text-center text-[11px] leading-5 font-extrabold text-ink">{unread}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
