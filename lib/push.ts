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
 * (404/410) are removed; other failures are logged. `admin` must be a
 * service-role client.
 */
export async function sendPushToUser(admin: SupabaseClient, userId: string, payload: PushPayload) {
  if (!isPushConfigured()) return { sent: 0, failed: 0 };
  ensureConfigured();

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  let sent = 0;
  let failed = 0;
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
        const { statusCode, body } = err as { statusCode?: number; body?: string };
        if (statusCode === 404 || statusCode === 410) stale.push(s.id);
        else {
          failed++;
          console.error("[push] send failed", statusCode, body ?? err);
        }
      }
    }),
  );
  if (stale.length) await admin.from("push_subscriptions").delete().in("id", stale);
  return { sent, failed };
}
