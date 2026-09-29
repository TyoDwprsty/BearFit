"use client";

import { useExitGuard } from "@/lib/use-back-nav";

/** Keeps the back gesture on the first page after sign-in from returning to Google. */
export function ExitGuard() {
  useExitGuard();
  return null;
}
