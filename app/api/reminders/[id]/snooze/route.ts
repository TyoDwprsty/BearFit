import { getViewer } from "@/lib/auth";

/** Snooze from a notification action (called by the service worker). */
export async function POST(_request: Request, ctx: RouteContext<"/api/reminders/[id]/snooze">) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const minutes = viewer.profile.alarm_snooze_min || 10;
  const until = new Date(Date.now() + minutes * 60_000).toISOString();
  const { error } = await viewer.supabase
    .from("reminders")
    .update({ snooze_until: until })
    .eq("id", id)
    .eq("user_id", viewer.userId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, until });
}
