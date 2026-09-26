"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { isR2Configured } from "@/lib/env";
import { makeT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { promoteUpload } from "@/lib/r2";
import type { Message } from "@/lib/types";

/** Sends a chat message; `stagedKey` is an optional photo already uploaded to R2 staging. */
export async function sendMessage(
  recipientId: string,
  body: string,
  stagedKey?: string | null,
): Promise<{ message?: Message; error?: string }> {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const text = body.trim().slice(0, 2000);

  let image: { key: string; url: string } | null = null;
  if (stagedKey && isR2Configured()) {
    image = await promoteUpload(stagedKey, viewer.userId, "chats").catch((err) => {
      console.error("[sendMessage] promote failed", err);
      return null;
    });
    if (!image) return { error: "photo_missing" };
  }
  if (!text && !image) return { error: "empty" };

  const { data, error } = await viewer.supabase
    .from("messages")
    .insert({
      sender_id: viewer.userId,
      recipient_id: recipientId,
      body: text,
      image_key: image?.key ?? null,
      image_url: image?.url ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return { error: error?.message ?? "failed" };

  // The recipient is a member if the sender is their coach, and vice versa.
  const { data: asCoach } = await viewer.supabase
    .from("coach_links")
    .select("id")
    .eq("coach_id", viewer.userId)
    .eq("member_id", recipientId)
    .eq("status", "active")
    .maybeSingle();
  await notify({
    userId: recipientId,
    actorId: viewer.userId,
    kind: "message",
    url: asCoach ? "/chat" : `/coach/chat/${viewer.userId}`,
    body: text || makeT(viewer.profile.locale)("chat.photoMsg"),
  });
  return { message: data as Message };
}

export async function markRead(otherId: string) {
  const viewer = await getViewer();
  if (!viewer) return;
  await viewer.supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", viewer.userId)
    .eq("sender_id", otherId)
    .is("read_at", null);
  revalidatePath("/coach/chat");
}
