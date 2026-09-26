import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { isR2Configured } from "@/lib/env";
import { ALLOWED_IMAGE_TYPES, presignUpload, stagingKeyFor } from "@/lib/r2";

const bodySchema = z.object({ contentType: z.enum(ALLOWED_IMAGE_TYPES) });

/**
 * Returns a presigned R2 PUT URL into the staging folder (`tmp/<userId>/`).
 * The browser uploads the compressed photo there; the server action that saves
 * the post/message later promotes it to its final location.
 */
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!isR2Configured()) return Response.json({ error: "r2_not_configured" }, { status: 503 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  const { contentType } = parsed.data;
  const key = stagingKeyFor(viewer.userId, contentType === "image/webp" ? "webp" : "jpg");
  const uploadUrl = await presignUpload(key, contentType);
  return Response.json({ key, uploadUrl });
}
