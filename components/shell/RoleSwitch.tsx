"use client";

import { useTransition } from "react";
import { switchRole } from "@/app/actions/preferences";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import type { Role } from "@/lib/types";
import { useProgress } from "@/components/feedback/NavigationProgress";

/** Switch button shown to users who are both member & coach. */
export function RoleSwitch({ current, className, compact }: { current: Role; className?: string; compact?: boolean }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  useProgress(pending, { page: true });
  const target: Role = current === "coach" ? "member" : "coach";
  const text = target === "coach" ? t("role.switchToCoach") : t("role.switchToMember");
  return (
    <button
      type="button"
      onClick={() => start(() => switchRole(target))}
      disabled={pending}
      aria-label={text}
      title={text}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-line bg-card font-bold text-text transition active:scale-95 disabled:opacity-60",
        compact ? "w-11 px-0" : "px-3.5 text-[13px]",
        className,
      )}
    >
      <Icon name="swap" size={18} className={cn(pending && "animate-spin")} />
      {!compact && <span>{text}</span>}
    </button>
  );
}
