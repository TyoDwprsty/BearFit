"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import type { Role } from "@/lib/types";
import { isActive, NAV } from "./nav-items";

/** Bottom navigation for phones (design: Komponen · NavBar). */
export function BottomNav({ mode, badges }: { mode: Role; badges?: Partial<Record<string, number>> }) {
  const pathname = usePathname();
  const { t } = useI18n();
  // Conversation screens own the bottom edge (pinned composer), like native chat apps.
  if (pathname === "/chat" || pathname.startsWith("/coach/chat/")) return null;
  return (
    <nav
      aria-label={t("nav.main")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-xl items-center justify-around px-3 pt-2 pb-[max(18px,env(safe-area-inset-bottom))]">
        {NAV[mode].map((item) => {
          const on = isActive(item, pathname);
          const badge = badges?.[item.href];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "relative flex min-h-[54px] min-w-16 flex-col items-center justify-center gap-[3px] rounded-[18px] transition",
                on ? "bg-grape-s text-grape-d" : "text-muted",
              )}
            >
              <Icon name={item.icon} size={22} strokeWidth={2.2} />
              <span className={cn("text-[11px]", on ? "font-extrabold" : "font-semibold")}>{t(item.label)}</span>
              {!!badge && (
                <span className="absolute top-1.5 right-3 min-w-4 rounded-full bg-berry px-1 text-center text-[10px] leading-4 font-extrabold text-ink">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Vertical navigation for the desktop sidebar. */
export function SideNavLinks({ mode, badges }: { mode: Role; badges?: Partial<Record<string, number>> }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const items = [...NAV[mode]];
  if (mode === "coach") items.splice(3, 0, { href: "/coach/exercises", icon: "workout", label: "nav.exercises" });
  return (
    <nav aria-label={t("nav.main")} className="flex flex-col gap-1">
      {items.map((item) => {
        const on = mode === "coach" && item.href === "/coach/programs" ? pathname.startsWith("/coach/programs") : isActive(item, pathname);
        const badge = badges?.[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center gap-3 rounded-2xl px-4 text-[15px] transition",
              on ? "bg-grape-s font-extrabold text-grape-d" : "font-semibold text-muted hover:bg-soft hover:text-text",
            )}
          >
            <Icon name={item.icon} size={22} />
            <span className="flex-1">{t(item.label)}</span>
            {!!badge && (
              <span className="rounded-full bg-berry px-2 text-xs leading-5 font-extrabold text-ink">{badge > 9 ? "9+" : badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
