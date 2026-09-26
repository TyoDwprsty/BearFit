import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { isPlaceholder, serverEnv } from "@/lib/env";
import { makeT, type DictKey, normalizeLocale } from "@/lib/i18n";
import { firstName } from "@/lib/format";
import { sendPushToUser } from "@/lib/push";

/**
 * In-app notification + web push to `userId`, written in the recipient's
 * language. Failures are swallowed: notifications must never break the
 * action that triggered them.
 */
export async function notify(opts: {
  userId: string;
  actorId: string;
  kind: "comment" | "like" | "message" | "linkRequest" | "linkAccepted" | "joined" | "plan";
  url: string;
  body?: string;
  push?: boolean;
}) {
  if (isPlaceholder(serverEnv.supabaseSecretKey)) return;
  try {
    const admin = createAdminClient();
    const { data: people } = await admin
      .from("profiles")
      .select("id, full_name, locale")
      .in("id", [opts.userId, opts.actorId]);
    const recipient = people?.find((p) => p.id === opts.userId);
    const actor = people?.find((p) => p.id === opts.actorId);
    const t = makeT(normalizeLocale(recipient?.locale));
    const title = t(`notif.${opts.kind}` as DictKey, { name: firstName(actor?.full_name) });

    await admin.from("notifications").insert({
      user_id: opts.userId,
      actor_id: opts.actorId,
      kind: opts.kind,
      title,
      body: opts.body ?? null,
      url: opts.url,
    });

    if (opts.push !== false) {
      await sendPushToUser(admin, opts.userId, {
        title,
        body: opts.body?.slice(0, 140),
        url: opts.url,
        tag: `${opts.kind}-${opts.actorId}`,
        type: "info",
      });
    }
  } catch (err) {
    console.error("[notify]", err);
  }
}
