"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Beru } from "@/components/Beru";
import { useI18n } from "@/components/I18nProvider";

/**
 * Loading feedback while the app waits on the network:
 * - page changes (link clicks, plain form POSTs, `startNavigation()`, and
 *   `useProgress(pending, { page: true })`) → top bar + blurred Beru overlay;
 * - in-place server actions (`useProgress(pending)`) → top bar only.
 */

let navigating = false;
let tasks = 0;
let pageTasks = 0;
let navTimer: number | undefined;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const isPageLoading = () => navigating || pageTasks > 0;
const isBusy = () => isPageLoading() || tasks > 0;
const never = () => false;

function setNavigating(value: boolean) {
  window.clearTimeout(navTimer);
  // Safety net: never leave the loader up if a navigation is cancelled.
  if (value) navTimer = window.setTimeout(() => setNavigating(false), 20_000);
  if (navigating === value) return;
  navigating = value;
  emit();
}

/** Shows the page loader manually, e.g. right before `router.push()`. */
export function startNavigation() {
  setNavigating(true);
}

/**
 * Shows the loader while `pending` is true. Use `{ page: true }` for actions that
 * end up on another page (redirects), so the full overlay is shown.
 */
export function useProgress(pending: boolean, { page = false }: { page?: boolean } = {}) {
  useEffect(() => {
    if (!pending) return;
    if (page) pageTasks++;
    else tasks++;
    emit();
    return () => {
      if (page) pageTasks--;
      else tasks--;
      emit();
    };
  }, [pending, page]);
}

function isSameDocument(url: URL) {
  return url.pathname === window.location.pathname && url.search === window.location.search;
}

export function NavigationProgress() {
  const { t } = useI18n();
  const busy = useSyncExternalStore(subscribe, isBusy, never);
  const pageLoading = useSyncExternalStore(subscribe, isPageLoading, never);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The URL changed → the navigation landed.
  useEffect(() => setNavigating(false), [pathname, searchParams]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.hasAttribute("download")) return;
      if (a.target && a.target !== "_self") return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || isSameDocument(url)) return;
      setNavigating(true);
    };
    const onSubmit = (e: SubmitEvent) => {
      // Plain HTML forms (e.g. sign out). Server-action forms use <SubmitButton>.
      const action = (e.target as HTMLFormElement).getAttribute("action");
      if (!e.defaultPrevented && action?.startsWith("/")) setNavigating(true);
    };
    // Coming back through the back/forward cache must not show a stale loader.
    const onPageShow = () => setNavigating(false);
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return (
    <>
      <div aria-hidden className="nav-progress" data-busy={busy || undefined}>
        <div className="nav-progress-bar" />
      </div>
      <div className="nav-overlay" data-busy={pageLoading || undefined} role="status" aria-live="polite">
        {pageLoading && (
          <div className="flex flex-col items-center gap-2 rounded-[32px] bg-card/90 px-8 pt-6 pb-5 shadow-float">
            <span className="animate-beru">
              <Beru pose="lift" size={96} />
            </span>
            <span className="text-sm font-bold text-muted">{t("common.loading")}</span>
          </div>
        )}
      </div>
    </>
  );
}
