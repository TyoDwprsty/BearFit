import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/auth";
import { LOCALE_COOKIE } from "@/lib/i18n";
import type { Profile } from "@/lib/types";
import { AUTH_INTENT_COOKIE, FRESH_SIGNIN_COOKIE, requestOrigin } from "@/lib/url";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = requestOrigin(request);
  const code = searchParams.get("code");
  // What the user picked on the welcome screen (set by /auth/login). Old links may still carry it in the URL.
  const intent = readIntent(request.cookies.get(AUTH_INTENT_COOKIE)?.value);
  const role = intent.role ?? searchParams.get("role");
  const next = intent.next ?? searchParams.get("next");

  if (!code) return NextResponse.redirect(`${origin}/?error=auth`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(`${origin}/?error=auth`);

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single<Profile>();

  // New account → onboarding with the picked role. Existing account → straight to its own
  // home (whatever button was pressed), or back to the page that asked for login.
  let target: string;
  if (!profile || !profile.onboarded) {
    const url = new URL("/onboarding", origin);
    if (role) url.searchParams.set("role", role);
    if (next) url.searchParams.set("next", next);
    target = url.pathname + url.search;
  } else if (next && next.startsWith("/") && !next.startsWith("//")) {
    target = next;
  } else {
    target = homeFor(profile);
  }

  const response = NextResponse.redirect(`${origin}${target}`);
  response.cookies.delete(AUTH_INTENT_COOKIE);
  // Read (and cleared) by useExitGuard on the first page, so it can't be httpOnly.
  response.cookies.set(FRESH_SIGNIN_COOKIE, "1", { path: "/", maxAge: 60 * 5, sameSite: "lax" });
  if (profile?.locale) {
    response.cookies.set(LOCALE_COOKIE, profile.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return response;
}

function readIntent(raw: string | undefined): { role?: string; next?: string } {
  try {
    const v = raw ? JSON.parse(raw) : {};
    return {
      role: v.role === "member" || v.role === "coach" ? v.role : undefined,
      next: typeof v.next === "string" && v.next.startsWith("/") && !v.next.startsWith("//") ? v.next : undefined,
    };
  } catch {
    return {};
  }
}
