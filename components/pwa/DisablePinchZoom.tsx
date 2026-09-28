"use client";

import { useEffect } from "react";

/**
 * iOS Safari ignores `user-scalable=no`, so block its pinch gestures directly.
 * Android/desktop are covered by the viewport meta + `touch-action` in globals.css.
 */
export function DisablePinchZoom() {
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("gesturestart", block);
    document.addEventListener("gesturechange", block);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", block);
      document.removeEventListener("gesturechange", block);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);
  return null;
}
