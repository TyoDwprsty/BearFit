"use client";

import { Beru } from "@/components/Beru";
import { useI18n } from "@/components/I18nProvider";
import { btn } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <Beru pose="alarm" size={140} />
      <p className="max-w-xs text-sm font-semibold text-muted">{t("common.error")}</p>
      <button type="button" onClick={reset} className={btn.primary}>
        ↻
      </button>
    </main>
  );
}
