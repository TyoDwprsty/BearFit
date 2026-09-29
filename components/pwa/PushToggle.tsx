"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { btn, cn } from "@/components/ui";
import { env, isPlaceholder } from "@/lib/env";
import { isIOS, useIsStandalone } from "./InstallPrompt";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Status = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

const noop = () => () => {};
const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** Enable / disable web push for this device. `variant="card"` shows the full callout. */
export function PushToggle({ variant = "row" }: { variant?: "row" | "card" }) {
  const { t } = useI18n();
  const standalone = useIsStandalone();
  const ios = useSyncExternalStore(noop, isIOS, () => false);
  const isSupported = useSyncExternalStore(noop, supported, () => true);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const configured = !isPlaceholder(env.vapidPublicKey);

  useEffect(() => {
    if (!supported()) return;
    let alive = true;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!alive) return;
        setSubscribed(!!sub);
        setPermission(Notification.permission);
      })
      .catch(() => alive && setSubscribed(false));
    return () => {
      alive = false;
    };
  }, []);

  let status: Status;
  if (ios && !standalone) status = "needs-install";
  else if (!isSupported) status = "unsupported";
  else if (subscribed === null) status = "loading";
  else if (permission === "denied") status = "denied";
  else status = subscribed ? "on" : "off";

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(env.vapidPublicKey),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setSubscribed(true);
    } catch {
      setMessage(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const { sent } = (await res.json().catch(() => ({}))) as { sent?: number };
      setMessage(!res.ok ? t("common.error") : sent ? t("rem.testSent") : t("rem.testNoDevice"));
    } finally {
      setBusy(false);
    }
  }

  const note =
    !configured
      ? t("rem.pushNotConfigured")
      : status === "needs-install"
        ? t("rem.iosHint")
        : status === "unsupported"
          ? t("rem.pushUnsupported")
          : status === "denied"
            ? t("rem.pushDenied")
            : null;

  if (variant === "card" && status === "on") return null;

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {status === "off" && configured && (
        <button type="button" disabled={busy} onClick={enable} className={cn(btn.small, "bg-grape text-on-grape")}>
          <Icon name="bell" size={16} />
          {t("rem.pushEnable")}
        </button>
      )}
      {status === "on" && (
        <>
          <button type="button" disabled={busy} onClick={test} className={cn(btn.small, "border border-line")}>
            {t("rem.test")}
          </button>
          <button type="button" disabled={busy} onClick={disable} className={btn.ghost}>
            {t("rem.pushDisable")}
          </button>
        </>
      )}
    </div>
  );

  if (variant === "card") {
    return (
      <div className="flex flex-col gap-3 rounded-[24px] border-2 border-dashed border-grape bg-grape-s p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-grape text-on-grape">
            <Icon name="bell" size={20} />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold">{t("rem.pushTitle")}</span>
            <span className="text-xs leading-snug text-muted">{note ?? t("rem.pushBody")}</span>
          </div>
        </div>
        {actions}
        {message && <p className="text-xs font-semibold text-grape-d">{message}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] leading-snug text-muted">{status === "on" ? `✓ ${t("rem.pushOn")}` : (note ?? t("rem.pushBody"))}</p>
      {actions}
      {message && <p className="text-xs font-semibold text-grape-d">{message}</p>}
    </div>
  );
}
