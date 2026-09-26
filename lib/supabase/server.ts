import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env, serverEnv } from "@/lib/env";

/** Supabase client bound to the current user's session cookies (RLS applies). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The session is refreshed in proxy.ts instead.
        }
      },
    },
  });
}

/**
 * Service-role client that bypasses RLS. Only for trusted server code
 * (cron, notifications). Never import from client components.
 */
export function createAdminClient() {
  return createSupabaseClient(env.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
