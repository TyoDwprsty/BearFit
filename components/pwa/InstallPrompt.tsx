"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Beru } from "@/components/Beru";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { btn, cn } from "@/components/ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "bf-install-dismissed";

function subscribeStandalone(cb: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function useIsStandalone() {
  return useSyncExternalStore(subscribeStandalone, getStandalone, () => true);
}

export function isIOS() {
  return typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function useInstallEvent() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  return event;
}

const noop = () => () => {};

/** Dismissible banner inviting the user to install the PWA. */
export function InstallPrompt() {
  const { t } = useI18n();
  const standalone = useIsStandalone();
  const event = useInstallEvent();
  const ios = useSyncExternalStore(noop, isIOS, () => false);
  const initiallyDismissed = useSyncExternalStore(
    noop,
    () => {
      try {
        return localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        return false;
      }
    },
    () => true,
  );
  const [dismissed, setDismissed] = useState(false);

  if (standalone || initiallyDismissed || dismissed || (!event && !ios)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div className="animate-rise flex items-center gap-2 rounded-[24px] border border-line bg-card py-2 pr-3 pl-1">
      <Beru pose="wave" size={64} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-bold">{t("pwa.installTitle")}</span>
        <span className="text-xs leading-snug text-muted">{ios ? t("rem.iosHint") : t("pwa.installBody")}</span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {event && (
          <button
            type="button"
            className={cn(btn.small, "bg-grape text-on-grape")}
            onClick={async () => {
              await event.prompt();
              await event.userChoice;
              dismiss();
            }}
          >
            <Icon name="download" size={16} />
            {t("profile.installBtn")}
          </button>
        )}
        <button type="button" onClick={dismiss} className="min-h-8 px-2 text-xs font-bold text-muted">
          {t("pwa.dismiss")}
        </button>
      </div>
    </div>
  );
}

/** Compact install row for the profile page. */
export function InstallRow() {
  const { t } = useI18n();
  const standalone = useIsStandalone();
  const event = useInstallEvent();
  const ios = useSyncExternalStore(noop, isIOS, () => false);

  if (standalone) {
    return <p className="text-sm font-semibold text-mint-d">✓ {t("profile.installed")}</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] leading-snug text-muted">{ios ? t("rem.iosHint") : t("profile.installBody")}</p>
      {event && (
        <button type="button" className={cn(btn.small, "self-start bg-grape text-on-grape")} onClick={() => event.prompt()}>
          <Icon name="download" size={16} />
          {t("profile.installBtn")}
        </button>
      )}
    </div>
  );
}
