"use client";

import { useState, useTransition } from "react";
import { setTheme } from "@/app/actions/preferences";
import { Icon, type IconName } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import type { DictKey } from "@/lib/i18n";
import type { ThemePref } from "@/lib/theme";

const OPTIONS: { value: ThemePref; icon: IconName }[] = [
  { value: "light", icon: "sun" },
  { value: "dark", icon: "moon" },
  { value: "system", icon: "globe" },
];

export function ThemeToggle({ current }: { current: ThemePref }) {
  const { t } = useI18n();
  const [value, setValue] = useState(current);
  const [, start] = useTransition();

  const apply = (v: ThemePref) => {
    setValue(v);
    // Apply instantly, then persist the cookie on the server.
    const root = document.documentElement;
    const dark = v === "dark" || (v === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.setAttribute("data-theme-pref", v);
    start(() => setTheme(v));
  };

  return (
    <div className="grid grid-cols-3 gap-1 rounded-[18px] bg-soft p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => apply(o.value)}
          className={cn(
            "flex min-h-11 items-center justify-center gap-1.5 rounded-[14px] text-[13px] font-bold transition",
            value === o.value ? "bg-card text-text shadow-sm" : "text-muted",
          )}
        >
          <Icon name={o.icon} size={16} />
          {t(`profile.theme.${o.value}` as DictKey)}
        </button>
      ))}
    </div>
  );
}
