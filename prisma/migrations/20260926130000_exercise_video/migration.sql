-- Coaches can attach a tutorial video link to an exercise.

-- AlterTable
ALTER TABLE "public"."exercises" ADD COLUMN "video_url" TEXT;

-- Hand-written (CHECK constraints aren't modelled by Prisma)
ALTER TABLE "public"."exercises" ADD CONSTRAINT "exercises_video_url_check"
  CHECK (video_url IS NULL OR (video_url ~ '^https://' AND char_length(video_url) <= 500));
