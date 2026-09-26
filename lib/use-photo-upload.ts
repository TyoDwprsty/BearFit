"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { compressImage, uploadToStaging } from "@/lib/image-client";

export type PhotoStatus = "uploading" | "ready" | "error";

export interface PickedPhoto {
  original: File;
  blob: Blob; // compressed WebP (or JPEG fallback)
  preview: string;
  status: PhotoStatus;
  stagedKey: string | null;
  error: string | null;
}

/**
 * Picks a photo, compresses it, and immediately uploads it to the R2 staging
 * folder in the background. `waitForKey()` resolves once that upload settles,
 * so submitting never has to start an upload from scratch.
 */
export function usePhotoUpload({ enabled = true }: { enabled?: boolean } = {}) {
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const pending = useRef<Promise<string | null> | null>(null);
  const token = useRef(0);

  // Revoke only when the preview itself changes (not on every status update).
  const preview = photo?.preview;
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const start = useCallback(
    (blob: Blob) => {
      const my = ++token.current;
      setPhoto((p) => (p ? { ...p, status: "uploading", error: null } : p));
      const run = uploadToStaging(blob)
        .then((key) => {
          if (token.current === my) setPhoto((p) => (p ? { ...p, status: "ready", stagedKey: key } : p));
          return key;
        })
        .catch((err: unknown) => {
          console.error("[upload]", err);
          const message = err instanceof Error ? err.message : String(err);
          if (token.current === my) setPhoto((p) => (p ? { ...p, status: "error", error: message } : p));
          return null;
        });
      pending.current = run;
      return run;
    },
    [],
  );

  const pick = useCallback(
    async (file: File) => {
      const blob = await compressImage(file, { maxSide: 1440, quality: 0.82, type: "image/webp" });
      setPhoto({ original: file, blob, preview: URL.createObjectURL(blob), status: enabled ? "uploading" : "error", stagedKey: null, error: enabled ? null : "r2_not_configured" });
      if (enabled) void start(blob);
      return file;
    },
    [enabled, start],
  );

  const retry = useCallback(() => {
    if (photo) void start(photo.blob);
  }, [photo, start]);

  const clear = useCallback(() => {
    token.current++;
    pending.current = null;
    setPhoto(null);
  }, []);

  /** Resolves to the staged key (or null if there is no photo / the upload failed). */
  const waitForKey = useCallback(async () => {
    if (!photo) return null;
    if (photo.stagedKey) return photo.stagedKey;
    return pending.current ? pending.current : null;
  }, [photo]);

  return { photo, pick, retry, clear, waitForKey };
}
