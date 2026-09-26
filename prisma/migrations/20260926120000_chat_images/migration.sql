-- Chat messages can carry a photo (stored in R2). A message needs text, a photo, or both.

-- AlterTable
ALTER TABLE "public"."messages" ADD COLUMN "image_key" TEXT,
ADD COLUMN "image_url" TEXT,
ALTER COLUMN "body" SET DEFAULT '';

-- Hand-written (CHECK constraints aren't modelled by Prisma)
ALTER TABLE "public"."messages" DROP CONSTRAINT IF EXISTS "messages_body_check";
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_body_check"
  CHECK (char_length(body) <= 2000 AND (char_length(body) > 0 OR image_url IS NOT NULL));
