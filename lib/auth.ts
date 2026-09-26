import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile, Role } from "@/lib/types";

/** Current signed-in user + profile, deduplicated per request. */
export const getViewer = cache(async () => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!profile) {
    console.error(
      `[auth] Signed in as ${userId} but no profile row was found (${error?.message ?? "empty"}). ` +
        "Did you run `npm run db:deploy`?",
    );
    return null;
  }
  return { supabase, userId, profile: profile as Profile };
});

export type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

export function homeFor(profile: Pick<Profile, "active_role" | "is_member" | "is_coach" | "onboarded">): string {
  if (!profile.onboarded) return "/onboarding";
  const role = profile.active_role ?? (profile.is_member ? "member" : "coach");
  return role === "coach" ? "/coach" : "/home";
}

/** Require an onboarded viewer; optionally require a role. */
export async function requireViewer(role?: Role): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const { profile } = viewer;
  if (!profile.onboarded) redirect("/onboarding");
  if (role === "member" && !profile.is_member) redirect("/coach");
  if (role === "coach" && !profile.is_coach) redirect("/home");
  return viewer;
}

/** Active coach of a member (if any). */
export async function getActiveCoach(viewer: Viewer) {
  const { data: link } = await viewer.supabase
    .from("coach_links")
    .select("id, coach_id, created_at")
    .eq("member_id", viewer.userId)
    .eq("status", "active")
    .maybeSingle();
  if (!link) return null;
  const { data: coach } = await viewer.supabase
    .from("profiles")
    .select("id, full_name, avatar_url, coach_bio")
    .eq("id", link.coach_id)
    .single();
  if (!coach) return null;
  return {
    linkId: link.id as string,
    since: link.created_at as string,
    id: coach.id as string,
    full_name: coach.full_name as string,
    avatar_url: coach.avatar_url as string | null,
    coach_bio: coach.coach_bio as string | null,
  };
}
