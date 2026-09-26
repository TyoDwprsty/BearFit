import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env, isPushConfigured, serverEnv } from "@/lib/env";

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  type?: "alarm" | "info";
  reminderId?: string;
  vibrate?: boolean;
  actionOpen?: string;
  actionSnooze?: string;
}

let configured = false;
function ensureConfigured() {
  if (!configured) {
    webpush.setVapidDetails(serverEnv.vapidSubject, env.vapidPublicKey, serverEnv.vapidPrivateKey);
    configured = true;
  }
}

/**
 * Sends a push to every subscription of a user. Expired subscriptions
 * (404/410) are removed. `admin` must be a service-role client.
 */
export async function sendPushToUser(admin: SupabaseClient, userId: string, payload: PushPayload) {
  if (!isPushConfigured()) return { sent: 0 };
  ensureConfigured();

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  let sent = 0;
  const stale: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 30, urgency: payload.type === "alarm" ? "high" : "normal" },
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) stale.push(s.id);
      }
    }),
  );
  if (stale.length) await admin.from("push_subscriptions").delete().in("id", stale);
  return { sent };
}
