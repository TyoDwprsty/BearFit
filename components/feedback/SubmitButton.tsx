"use client";

import { useFormStatus } from "react-dom";
import { useProgress } from "./NavigationProgress";

/**
 * Submit button for server-action forms: disables itself and spins while the action runs.
 * `page` = the action redirects elsewhere, so show the full page loader.
 */
export function SubmitButton({ className, page, children }: { className?: string; page?: boolean; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  useProgress(pending, { page });
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {children}
    </button>
  );
}
