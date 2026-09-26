import type { IconName } from "@/components/Icon";
import type { DictKey } from "@/lib/i18n";
import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  icon: IconName;
  label: DictKey;
  /** Extra path prefixes that also mark this item active. */
  match?: string[];
}

export const NAV: Record<Role, NavItem[]> = {
  member: [
    { href: "/home", icon: "home", label: "nav.home", match: ["/chat", "/notifications"] },
    { href: "/food", icon: "food", label: "nav.food", match: ["/community"] },
    { href: "/workout", icon: "workout", label: "nav.workout" },
    { href: "/progress", icon: "progress", label: "nav.progress" },
    { href: "/reminders", icon: "bell", label: "nav.reminders" },
  ],
  coach: [
    { href: "/coach", icon: "members", label: "nav.members", match: ["/coach/members"] },
    { href: "/coach/chat", icon: "chat", label: "nav.chat" },
    { href: "/coach/programs", icon: "program", label: "nav.programs", match: ["/coach/exercises"] },
    { href: "/profile", icon: "profile", label: "nav.profile", match: ["/notifications"] },
  ],
};

export function isActive(item: NavItem, pathname: string): boolean {
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((p) => {
    if (p === "/coach") return pathname === "/coach";
    return pathname === p || pathname.startsWith(`${p}/`);
  });
}
