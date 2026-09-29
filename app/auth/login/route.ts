import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { AUTH_INTENT_COOKIE, requestOrigin } from "@/lib/url";

/** Starts Google OAuth. `role` (member|coach) pre-selects onboarding; `next` is where to land after. */
export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  if (!isSupabaseConfigured()) return NextResponse.redirect(`${origin}/?error=setup`);

  const role = request.nextUrl.searchParams.get("role");
  const next = request.nextUrl.searchParams.get("next");
  const intent = {
    role: role === "member" || role === "coach" ? role : undefined,
    next: next && next.startsWith("/") && !next.startsWith("//") ? next : undefined,
  };

  // role/next travel in a short-lived cookie, NOT in the callback URL: Supabase only
  // honours `redirectTo` when it exactly matches an allowed Redirect URL, and extra
  // query params break that match (it then falls back to the Site URL, e.g. localhost).
  const store = await cookies();
  store.set(AUTH_INTENT_COOKIE, JSON.stringify(intent), {
    path: "/",
    maxAge: 60 * 10,
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
  });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) return NextResponse.redirect(`${origin}/?error=auth`);
  return NextResponse.redirect(data.url);
}
