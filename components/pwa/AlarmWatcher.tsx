"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { localParts } from "@/lib/dates";
import { isDueAt } from "@/lib/reminders";
import type { Reminder } from "@/lib/types";

/**
 * While the app is open, opens the full-screen alarm when a reminder is due.
 * (When the app is closed, the server cron + web push handles it instead.)
 */
export function AlarmWatcher({ reminders, timezone }: { reminders: Reminder[]; timezone: string }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!reminders.length) return;
    const check = () => {
      if (document.visibilityState !== "visible" || pathname.startsWith("/alarm")) return;
      const now = new Date();
      const { dateStr, weekday, hour, minute } = localParts(now, timezone);
      const m = hour * 60 + minute;
      for (const r of reminders) {
        if (!isDueAt(r, weekday, m)) continue;
        const key = `bf-alarm:${r.id}:${dateStr}:${m}`;
        try {
          if (sessionStorage.getItem(key)) continue;
          sessionStorage.setItem(key, "1");
        } catch {
          // storage unavailable: still show the alarm once per render cycle
        }
        router.push(`/alarm/${r.id}`);
        return;
      }
    };
    check();
    const id = window.setInterval(check, 15_000);
    return () => window.clearInterval(id);
  }, [reminders, timezone, router, pathname]);

  return null;
}
