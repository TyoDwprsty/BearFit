"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(env.supabaseUrl, env.supabaseKey);
  }
  return browserClient;
}
