import Link from "next/link";
import { ChatThread } from "@/components/chat/ChatThread";
import { Avatar, BackHeader } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { getConversation } from "@/lib/chat";
import { requireMember } from "@/lib/coach";
import { isR2Configured } from "@/lib/env";
import { makeT } from "@/lib/i18n";

export const metadata = { title: "Pesan" };

export default async function CoachChatPage({ params }: PageProps<"/coach/chat/[memberId]">) {
  const viewer = await requireViewer("coach");
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);
  const { memberId } = await params;
  const member = await requireMember(supabase, userId, memberId);
  const messages = await getConversation(supabase, userId, memberId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <BackHeader
        href="/coach/chat"
        backLabel={t("common.back")}
        title={member.full_name}
        right={
          <Link href={`/coach/members/${memberId}`} aria-label={t("coach.detail")}>
            <Avatar name={member.full_name} src={member.avatar_url} id={member.id} size={44} />
          </Link>
        }
      />
      <ChatThread
        me={userId}
        otherId={memberId}
        initial={messages}
        timezone={profile.timezone}
        uploadEnabled={isR2Configured()}
        quickReplies={[t("coach.quick.1"), t("coach.quick.2"), t("coach.quick.3"), t("coach.quick.4")]}
      />
    </div>
  );
}
