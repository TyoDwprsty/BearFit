import { getViewer } from "@/lib/auth";
import { isR2Configured } from "@/lib/env";
import { ALLOWED_IMAGE_TYPES, putStagedObject, STAGING_PREFIX } from "@/lib/r2";

// Vercel caps function request bodies at 4.5 MB; compressed photos are far below this.
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Fallback for `/api/upload`: when the browser's direct PUT to R2 is blocked by
 * bucket CORS, it sends the (already compressed) photo here and we store it in
 * the same staging key the presign step handed out.
 */
export async function PUT(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!isR2Configured()) return Response.json({ error: "r2_not_configured" }, { status: 503 });

  const key = new URL(request.url).searchParams.get("key") ?? "";
  const ownPrefix = `${STAGING_PREFIX}${viewer.userId}/`;
  if (!key.startsWith(ownPrefix) || !/^[\w-]+\.(jpg|webp)$/.test(key.slice(ownPrefix.length))) {
    return Response.json({ error: "invalid_key" }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType)) {
    return Response.json({ error: "invalid_type" }, { status: 415 });
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return Response.json({ error: "too_large" }, { status: 413 });

  const body = new Uint8Array(await request.arrayBuffer());
  if (!body.byteLength) return Response.json({ error: "empty" }, { status: 400 });
  if (body.byteLength > MAX_BYTES) return Response.json({ error: "too_large" }, { status: 413 });

  await putStagedObject(key, contentType, body);
  return Response.json({ key });
}
