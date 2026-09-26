import Link from "next/link";
import { Beru } from "@/components/Beru";
import { Avatar, btn } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { firstName } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { JoinButton } from "./JoinButton";

export const metadata = { title: "Undangan coach" };

type CoachCard = { id: string; full_name: string; avatar_url: string | null; coach_bio: string | null };

export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const { t } = await getT();
  const viewer = await getViewer();

  let coach: CoachCard | null = null;
  if (isSupabaseConfigured()) {
    const db = viewer?.supabase ?? (await createClient());
    const { data } = await db.rpc("coach_by_code", { p_code: code });
    coach = (data as CoachCard[] | null)?.[0] ?? null;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-sun px-6 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-[36px] bg-bg px-6 py-8 text-center">
        <Beru pose={coach ? "wave" : "alarm"} size={140} />
        <h1 className="font-display text-[28px] font-semibold">{t("join.title")}</h1>
        {coach ? (
          <>
            <div className="flex w-full items-center gap-3 rounded-[22px] border border-line bg-card p-3 text-left">
              <Avatar name={coach.full_name} src={coach.avatar_url} accent="grape" size={52} />
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-display text-lg font-semibold">{coach.full_name}</span>
                {coach.coach_bio && <span className="line-clamp-2 text-xs text-muted">{coach.coach_bio}</span>}
              </div>
            </div>
            <p className="text-sm text-muted">{t("join.body", { name: firstName(coach.full_name) })}</p>
            {viewer ? (
              viewer.profile.is_member ? (
                <JoinButton code={code} label={t("join.cta", { name: firstName(coach.full_name) })} />
              ) : (
                <p className="rounded-2xl bg-berry-s px-4 py-3 text-sm font-semibold text-berry-d">{t("err.not_member")}</p>
              )
            ) : (
              <a
                href={`/auth/login?role=member&next=${encodeURIComponent(`/join/${code}`)}`}
                className={`${btn.primary} w-full`}
              >
                {t("welcome.google")}
              </a>
            )}
          </>
        ) : (
          <p className="text-sm font-semibold text-muted">{t("join.invalid")}</p>
        )}
        <Link href="/" className="text-sm font-bold text-grape-d">
          {t("app.name")}
        </Link>
      </div>
    </main>
  );
}
