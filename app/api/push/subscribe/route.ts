import { z } from "zod";
import { getViewer } from "@/lib/auth";

const subSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });

  const parsed = subSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "invalid_subscription" }, { status: 400 });

  const { endpoint, keys } = parsed.data;
  // An endpoint belongs to one device; re-point it to the current user.
  await viewer.supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  const { error } = await viewer.supabase.from("push_subscriptions").insert({
    user_id: viewer.userId,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: request.headers.get("user-agent")?.slice(0, 250) ?? null,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { endpoint } = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) {
    await viewer.supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", viewer.userId);
  }
  return Response.json({ ok: true });
}
