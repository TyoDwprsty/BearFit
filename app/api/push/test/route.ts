import { getViewer } from "@/lib/auth";
import { isPlaceholder, isPushConfigured, serverEnv } from "@/lib/env";
import { makeT } from "@/lib/i18n";
import { firstName } from "@/lib/format";
import { sendPushToUser } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/server";

/** Sends a sample alarm push to the current user's devices. */
export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!isPushConfigured() || isPlaceholder(serverEnv.supabaseSecretKey)) {
    return Response.json({ error: "push_not_configured" }, { status: 503 });
  }
  const t = makeT(viewer.profile.locale);
  const result = await sendPushToUser(createAdminClient(), viewer.userId, {
    title: t("alarm.title", { name: firstName(viewer.profile.full_name) }),
    body: t("rem.testSent"),
    url: "/reminders",
    tag: "test",
    type: "info",
  });
  return Response.json(result);
}
