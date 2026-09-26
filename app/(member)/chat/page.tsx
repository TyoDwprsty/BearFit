import Link from "next/link";
import { ChatThread } from "@/components/chat/ChatThread";
import { Avatar, BackHeader, btn, EmptyState } from "@/components/ui";
import { getActiveCoach, requireViewer } from "@/lib/auth";
import { getConversation } from "@/lib/chat";
import { firstName } from "@/lib/format";
import { isR2Configured } from "@/lib/env";
import { makeT } from "@/lib/i18n";

export const metadata = { title: "Pesan" };

export default async function MemberChatPage() {
  const viewer = await requireViewer("member");
  const t = makeT(viewer.profile.locale);
  const coach = await getActiveCoach(viewer);

  if (!coach) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <BackHeader href="/home" backLabel={t("common.back")} title={t("chat.title")} />
        <EmptyState
          text={t("chat.noCoach")}
          action={
            <Link href="/profile#coach" className={btn.primary}>
              {t("home.findCoach")}
            </Link>
          }
        />
      </div>
    );
  }

  const messages = await getConversation(viewer.supabase, viewer.userId, coach.id);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <BackHeader
        href="/home"
        backLabel={t("common.back")}
        title={`${t("common.coach")} ${firstName(coach.full_name)}`}
        right={<Avatar name={coach.full_name} src={coach.avatar_url} accent="grape" size={44} />}
      />
      <ChatThread me={viewer.userId} otherId={coach.id} initial={messages} timezone={viewer.profile.timezone} uploadEnabled={isR2Configured()} />
    </div>
  );
}
