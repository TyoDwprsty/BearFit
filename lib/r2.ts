import "server-only";
import { CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverEnv } from "@/lib/env";

let client: S3Client | null = null;

function r2() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${serverEnv.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: serverEnv.r2AccessKeyId,
        secretAccessKey: serverEnv.r2SecretAccessKey,
      },
      // Newer AWS SDKs add CRC32 checksum params to presigned URLs, which the
      // browser can't satisfy and R2 may reject. Only send them when required.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Two-step storage:
 *   1. The browser uploads a compressed photo to `tmp/<userId>/…` (staging) as
 *      soon as it is picked, so posting feels instant.
 *   2. When the post/message is saved, the server promotes it to its final
 *      folder (`meals/…`, `chats/…`) and deletes the staged copy.
 * Photos that are never posted stay in `tmp/` and are removed by an R2
 * lifecycle rule (see README).
 */
export const STAGING_PREFIX = "tmp/";
export type PhotoKind = "meals" | "chats";

export function publicUrlFor(key: string) {
  return `${serverEnv.r2PublicUrl}/${key}`;
}

export function stagingKeyFor(userId: string, ext: string) {
  return `${STAGING_PREFIX}${userId}/${crypto.randomUUID()}.${ext}`;
}

/** Presigned PUT URL so the browser uploads straight to R2 (no Vercel bandwidth). */
export async function presignUpload(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: serverEnv.r2Bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2(), command, { expiresIn: 300 });
}

/**
 * Server-side upload into staging. Fallback for when the browser can't PUT to
 * R2 directly (bucket CORS doesn't allow the current origin yet).
 */
export async function putStagedObject(key: string, contentType: string, body: Uint8Array) {
  await r2().send(new PutObjectCommand({ Bucket: serverEnv.r2Bucket, Key: key, ContentType: contentType, Body: body }));
}

/**
 * Moves a staged upload owned by `userId` into its final folder.
 * Returns null when the key isn't a valid staged object of that user.
 */
export async function promoteUpload(stagedKey: string, userId: string, kind: PhotoKind) {
  const prefix = `${STAGING_PREFIX}${userId}/`;
  const file = stagedKey.slice(prefix.length);
  if (!stagedKey.startsWith(prefix) || !/^[0-9a-f-]{36}\.(webp|jpg)$/.test(file)) return null;

  const s3 = r2();
  const head = await s3.send(new HeadObjectCommand({ Bucket: serverEnv.r2Bucket, Key: stagedKey })).catch(() => null);
  if (!head || (head.ContentLength ?? 0) > MAX_UPLOAD_BYTES) return null;

  const finalKey = `${kind}/${userId}/${new Date().toISOString().slice(0, 7)}/${file}`;
  await s3.send(
    new CopyObjectCommand({
      Bucket: serverEnv.r2Bucket,
      Key: finalKey,
      CopySource: `${serverEnv.r2Bucket}/${encodeURIComponent(stagedKey)}`,
      ContentType: head.ContentType,
      CacheControl: "public, max-age=31536000, immutable",
      MetadataDirective: "REPLACE",
    }),
  );
  await s3.send(new DeleteObjectCommand({ Bucket: serverEnv.r2Bucket, Key: stagedKey })).catch(() => {});
  return { key: finalKey, url: publicUrlFor(finalKey) };
}

export async function deleteObject(key: string) {
  await r2().send(new DeleteObjectCommand({ Bucket: serverEnv.r2Bucket, Key: key }));
}
