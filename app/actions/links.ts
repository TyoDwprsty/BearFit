"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { notify } from "@/lib/notify";

function rpcError(message: string | undefined) {
  if (!message) return "unknown";
  for (const code of ["invalid_code", "self_link", "not_member", "not_coach", "not_found"]) {
    if (message.includes(code)) return code;
  }
  return "unknown";
}

function revalidateAll() {
  revalidatePath("/profile");
  revalidatePath("/home");
  revalidatePath("/coach", "layout");
}

export async function joinByCode(code: string): Promise<{ error?: string; coachId?: string }> {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const { data, error } = await viewer.supabase.rpc("join_coach_by_code", { p_code: code });
  if (error) return { error: rpcError(error.message) };
  const coachId = data as string;
  await notify({ userId: coachId, actorId: viewer.userId, kind: "joined", url: `/coach/members/${viewer.userId}` });
  revalidateAll();
  return { coachId };
}

export async function searchCoaches(query: string) {
  const viewer = await getViewer();
  if (!viewer) return [];
  const { data } = await viewer.supabase.rpc("search_coaches", { p_query: query.slice(0, 80) });
  return (data ?? []) as { id: string; full_name: string; avatar_url: string | null; coach_bio: string | null }[];
}

export async function requestCoach(coachId: string) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const { error } = await viewer.supabase.rpc("request_coach", { p_coach: coachId });
  if (error) return { error: rpcError(error.message) };
  await notify({ userId: coachId, actorId: viewer.userId, kind: "linkRequest", url: "/coach" });
  revalidateAll();
  return { ok: true };
}

export async function respondToRequest(linkId: string, accept: boolean) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const { data: link } = await viewer.supabase.from("coach_links").select("member_id").eq("id", linkId).maybeSingle();
  const { error } = await viewer.supabase.rpc("respond_link", { p_link: linkId, p_accept: accept });
  if (error) return { error: rpcError(error.message) };
  if (accept && link) {
    await notify({ userId: link.member_id, actorId: viewer.userId, kind: "linkAccepted", url: "/home" });
  }
  revalidateAll();
  return { ok: true };
}

export async function endLink(linkId: string) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  await viewer.supabase.rpc("end_link", { p_link: linkId });
  revalidateAll();
}
