"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Registers /sw.js and opens the alarm screen when a push arrives while the app is visible. */
export function ServiceWorkerRegister() {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; payload?: { type?: string; url?: string } } | undefined;
      if (data?.type !== "bearfit:push") return;
      if (data.payload?.type === "alarm" && data.payload.url && document.visibilityState === "visible") {
        router.push(data.payload.url);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}
