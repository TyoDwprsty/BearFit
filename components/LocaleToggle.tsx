"use client";

import { useTransition } from "react";
import { setLocale } from "@/app/actions/preferences";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/components/ui";

export function LocaleToggle({ className }: { className?: string }) {
  const { locale } = useI18n();
  const [pending, start] = useTransition();
  return (
    <div className={cn("flex gap-1 rounded-full bg-card/80 p-1 text-xs font-extrabold backdrop-blur", className)} aria-busy={pending}>
      {(["id", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => start(() => setLocale(l))}
          aria-pressed={locale === l}
          className={cn("min-h-8 rounded-full px-3 uppercase transition", locale === l ? "bg-grape text-on-grape" : "text-muted")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
