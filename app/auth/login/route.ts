import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

/** Starts Google OAuth. `role` (member|coach) pre-selects onboarding; `next` is where to land after. */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  if (!isSupabaseConfigured()) return NextResponse.redirect(`${origin}/?error=setup`);

  const role = request.nextUrl.searchParams.get("role");
  const next = request.nextUrl.searchParams.get("next");
  const callback = new URL("/auth/callback", origin);
  if (role === "member" || role === "coach") callback.searchParams.set("role", role);
  if (next && next.startsWith("/") && !next.startsWith("//")) callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) return NextResponse.redirect(`${origin}/?error=auth`);
  return NextResponse.redirect(data.url);
}
