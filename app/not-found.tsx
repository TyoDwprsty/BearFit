import Link from "next/link";
import { Beru } from "@/components/Beru";
import { btn } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <Beru pose="alarm" size={160} />
      <h1 className="font-display text-[56px] leading-none font-bold">404</h1>
      <p className="max-w-xs text-sm font-semibold text-muted">{t("join.invalid").split(".")[0]}.</p>
      <Link href="/" className={btn.primary}>
        {t("app.name")}
      </Link>
    </main>
  );
}
