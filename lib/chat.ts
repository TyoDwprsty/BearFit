import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "@/lib/types";

/** Last `limit` messages between two users, oldest first. */
export async function getConversation(db: SupabaseClient, a: string, b: string, limit = 80) {
  const { data } = await db
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${a},recipient_id.eq.${b}),and(sender_id.eq.${b},recipient_id.eq.${a})`)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Message[]).reverse();
}
