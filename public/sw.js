/* BearFit service worker — web push, alarm notifications, install support. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// A fetch handler keeps older Chromium versions happy about installability.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "BearFit", body: event.data ? event.data.text() : "" };
  }

  const isAlarm = data.type === "alarm";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag: data.tag || "bearfit",
    renotify: true,
    requireInteraction: isAlarm,
    silent: false,
    vibrate: data.vibrate === false ? undefined : [400, 150, 400, 150, 800],
    timestamp: Date.now(),
    data: { url: data.url || "/home", reminderId: data.reminderId || null, type: data.type || "info" },
    actions:
      isAlarm && data.reminderId
        ? [
            { action: "open", title: data.actionOpen || "Buka" },
            { action: "snooze", title: data.actionSnooze || "Tunda" },
          ]
        : [],
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title || "BearFit", options);
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) client.postMessage({ type: "bearfit:push", payload: data });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { url, reminderId } = event.notification.data || {};

  if (event.action === "snooze" && reminderId) {
    event.waitUntil(fetch(`/api/reminders/${reminderId}/snooze`, { method: "POST", credentials: "include" }));
    return;
  }

  event.waitUntil(
    (async () => {
      const target = new URL(url || "/home", self.location.origin).href;
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        await client.focus();
        if ("navigate" in client) return client.navigate(target);
        return;
      }
      return self.clients.openWindow(target);
    })(),
  );
});
