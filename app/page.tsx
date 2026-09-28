import { redirect } from "next/navigation";
import { Beru } from "@/components/Beru";
import { LocaleToggle } from "@/components/LocaleToggle";
import { btn } from "@/components/ui";
import { getViewer, homeFor } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { Alert } from "@/components/feedback/Alert";

export default async function WelcomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const viewer = await getViewer();
  if (viewer) redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : homeFor(viewer.profile));

  const { t } = await getT();
  const configured = isSupabaseConfigured();
  const loginHref = (role?: "member" | "coach") => {
    const q = new URLSearchParams();
    if (role) q.set("role", role);
    if (next) q.set("next", next);
    const s = q.toString();
    return `/auth/login${s ? `?${s}` : ""}`;
  };

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-sun lg:flex-row">
      <LocaleToggle className="absolute top-[max(16px,env(safe-area-inset-top))] right-4 z-10" />

      <div className="relative flex flex-1 items-center justify-center pt-16 pb-6 lg:pt-0">
        {/* confetti */}
        <span className="absolute top-[70px] left-7 h-[26px] w-[26px] rotate-[18deg] rounded-lg bg-mango" />
        <span className="absolute top-[110px] right-9 h-[18px] w-[18px] rounded-full bg-grape" />
        <span className="absolute top-[330px] left-[60px] h-3.5 w-3.5 rounded-full bg-berry" />
        <span className="absolute top-[300px] right-[54px] h-3 w-[30px] -rotate-[24deg] rounded-md bg-mint" />
        <span className="absolute top-11 left-[150px] h-3 w-3 rotate-[30deg] rounded bg-sky" />
        <div className="flex h-[290px] w-[290px] items-center justify-center rounded-full bg-[#FFE08A] lg:h-[420px] lg:w-[420px]">
          <Beru pose="cheer" size={250} className="animate-beru lg:h-[360px] lg:w-[360px]" title="Beru" />
        </div>
      </div>

      <section className="flex flex-col gap-3.5 rounded-t-[36px] bg-bg px-6 pt-[34px] pb-[max(36px,env(safe-area-inset-bottom))] lg:w-[480px] lg:justify-center lg:rounded-none lg:rounded-l-[36px] lg:px-12">
        <span className="self-start rounded-full bg-mint-s px-3 py-1.5 text-xs font-bold text-mint-d">{t("app.tagline")}</span>
        <h1 className="font-display text-[44px] leading-[1.05] font-bold tracking-tight">{t("app.name")}</h1>
        <p className="text-base leading-relaxed text-muted">{t("welcome.body")}</p>

        {params.error && (
          <Alert>{params.error === "setup" ? t("setup.body") : t("welcome.authError")}</Alert>
        )}
        {!configured && (
          <div className="rounded-2xl border-2 border-dashed border-line px-4 py-3 text-sm">
            <strong className="block font-display text-base">{t("setup.title")}</strong>
            <span className="text-muted">{t("setup.body")}</span>
          </div>
        )}

        <div className="mt-2 flex flex-col gap-2.5">
          <a href={loginHref("member")} className={btn.primary}>
            {t("welcome.member")}
          </a>
          <a href={loginHref("coach")} className={btn.outline}>
            {t("welcome.coach")}
          </a>
        </div>
        <a
          href={loginHref()}
          className="flex min-h-11 items-center gap-1 self-center text-sm font-semibold text-muted"
        >
          {t("welcome.haveAccount")} <strong className="text-grape-d">{t("welcome.signIn")}</strong>
        </a>
      </section>
    </main>
  );
}
