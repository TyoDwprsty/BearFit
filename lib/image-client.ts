"use client";

export type ImageFormat = "image/webp" | "image/jpeg";

/**
 * Downscale + re-encode a photo in the browser. WebP is preferred (≈30% smaller
 * than JPEG at the same clarity); browsers that can't encode WebP (older Safari)
 * silently fall back to JPEG.
 */
export async function compressImage(
  file: Blob,
  { maxSide = 1440, quality = 0.82, type = "image/webp" }: { maxSide?: number; quality?: number; type?: ImageFormat } = {},
): Promise<Blob> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  if ("close" in bitmap) (bitmap as ImageBitmap).close();

  const encode = (t: ImageFormat, q: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, t, q));

  let blob = await encode(type, quality);
  // Unsupported types come back as PNG (or null) — use JPEG instead.
  if (!blob || blob.type !== type) blob = await encode("image/jpeg", Math.min(0.88, quality + 0.04));
  if (!blob) throw new Error("encode failed");
  return blob;
}

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall through to <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads a compressed photo to the R2 staging folder via a presigned URL.
 * Returns the staged key; the server promotes it when the post/message is saved.
 */
export async function uploadToStaging(blob: Blob): Promise<string> {
  const contentType = blob.type === "image/webp" ? "image/webp" : "image/jpeg";
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(`presign ${res.status} ${detail.error ?? ""}`.trim());
  }
  const { key, uploadUrl } = (await res.json()) as { key: string; uploadUrl: string };
  let put: Response;
  try {
    put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: blob });
  } catch {
    // A network-level failure on PUT is almost always a missing R2 CORS rule for
    // this origin (new domain, preview deploy, LAN IP…). Go through our own API instead.
    console.warn("[upload] direct R2 upload blocked — add this origin to the bucket CORS. Using server fallback.");
    return uploadViaServer(key, blob, contentType);
  }
  if (!put.ok) throw new Error(`upload ${put.status}: ${(await put.text()).slice(0, 200)}`);
  return key;
}

/** Same-origin fallback: the app server writes the staged object to R2. */
async function uploadViaServer(key: string, blob: Blob, contentType: string): Promise<string> {
  const res = await fetch(`/api/upload/direct?key=${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(`upload ${res.status} ${detail.error ?? ""}`.trim());
  }
  return key;
}
