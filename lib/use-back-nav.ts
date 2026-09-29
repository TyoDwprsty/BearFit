"use client";

import { useEffect, useRef, useState } from "react";
import { FRESH_SIGNIN_COOKIE } from "@/lib/url";

// Just enough of the Navigation API (Chromium, Safari 26+, Firefox 147+). Entries are
// tracked by `key`, which survives the replaceState calls Next.js makes on refresh —
// unlike custom fields in `history.state`, which Next.js drops.
type NavEntry = { readonly key: string; readonly index: number; readonly url: string | null };
type Nav = EventTarget & { readonly currentEntry: NavEntry | null; entries(): NavEntry[] };

function navigationApi(): Nav | null {
  const nav = (window as unknown as { navigation?: Nav }).navigation;
  return nav?.currentEntry ? nav : null;
}

/** Same-URL history entry, so the back gesture has something to pop that isn't a page change. */
function pushGuardEntry() {
  // Keeps Next's `__NA` marker, so its patched pushState passes this straight through.
  history.pushState(history.state, "");
}

// Entries left behind by overlays that closed by navigating away (e.g. a link inside a
// sheet). They show the same page as the entry below them, so back steps over them.
const stale = new Set<string>();
let watchingStale = false;
function watchStaleEntries(nav: Nav) {
  if (watchingStale) return;
  watchingStale = true;
  let lastIndex = nav.currentEntry?.index ?? 0;
  nav.addEventListener("currententrychange", () => {
    const cur = nav.currentEntry;
    if (!cur) return;
    if (stale.has(cur.key)) {
      if (cur.index < lastIndex) history.back();
      else history.forward();
      return;
    }
    lastIndex = cur.index;
  });
}

/**
 * While `open`, the phone's back gesture calls `onBack` (close the sheet / overlay)
 * instead of leaving the page. If the overlay closes some other way, its history
 * entry is removed again. If `onBack` keeps it open (e.g. "stop the timer?" → no),
 * back is re-armed.
 */
export function useBackToClose(open: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });
  const [armed, rearm] = useState(0);

  useEffect(() => {
    if (!open) return;
    const nav = navigationApi();
    if (!nav) return;
    watchStaleEntries(nav);

    let mine: { key: string; index: number; url: string | null } | null = null;
    let popped = false;
    const onPop = () => {
      const cur = nav.currentEntry;
      if (!mine || popped || !cur || cur.index >= mine.index) return;
      popped = true;
      onBackRef.current();
      rearm((n) => n + 1);
    };
    // Deferred so React's dev double-mount doesn't push twice.
    const timer = setTimeout(() => {
      pushGuardEntry();
      const cur = nav.currentEntry!;
      mine = { key: cur.key, index: cur.index, url: cur.url };
      window.addEventListener("popstate", onPop);
    });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", onPop);
      const cur = nav.currentEntry;
      if (!mine || popped || !cur) return;
      if (cur.key === mine.key) {
        // Closed with its own button / Esc: drop our entry. (Same key but another URL
        // means a router.replace() took the entry over — leave it alone.)
        if (cur.url === mine.url) history.back();
      } else if (cur.index > mine.index) {
        stale.add(mine.key);
      }
    };
  }, [open, armed]);
}

const EXIT_GUARD_KEY = "bf-exit-guard";

/**
 * Right after Google sign-in the history below the app is Google's account picker
 * and the welcome screen. On the first app page, back then stays in the app instead
 * of dropping the user onto those.
 */
export function useExitGuard() {
  useEffect(() => {
    const nav = navigationApi();
    if (!nav) return;

    let active = false;
    try {
      if (document.cookie.split("; ").some((c) => c.startsWith(`${FRESH_SIGNIN_COOKIE}=`))) {
        document.cookie = `${FRESH_SIGNIN_COOKIE}=; path=/; max-age=0`;
        sessionStorage.setItem(EXIT_GUARD_KEY, "1");
      }
      active = sessionStorage.getItem(EXIT_GUARD_KEY) === "1";
    } catch {}
    if (!active) return;

    // index 0 = oldest entry of this app visit; a longer history means something foreign is below it.
    const atFloor = () => {
      const cur = nav.currentEntry;
      return !!cur && cur.index === 0 && history.length > nav.entries().length;
    };
    const timer = setTimeout(() => {
      if (atFloor()) pushGuardEntry();
    });
    const onPop = () => {
      // Came back down to the floor: return to the page the user was on.
      if (atFloor()) history.forward();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", onPop);
    };
  }, []);
}
