import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/auth";
import { LOCALE_COOKIE } from "@/lib/i18n";
import type { Profile } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const role = searchParams.get("role");
  const next = searchParams.get("next");

  if (!code) return NextResponse.redirect(`${origin}/?error=auth`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(`${origin}/?error=auth`);

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single<Profile>();

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
  if (profile?.locale) {
    response.cookies.set(LOCALE_COOKIE, profile.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return response;
}
