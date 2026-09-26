-- Replace the expression index (least/greatest) with plain composite indexes
-- that Prisma can model. Both chat-direction lookups stay indexed.
DROP INDEX IF EXISTS "public"."messages_pair";

-- CreateIndex
CREATE INDEX "messages_sender_recipient" ON "public"."messages"("sender_id", "recipient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "messages_recipient_sender" ON "public"."messages"("recipient_id", "sender_id", "created_at" DESC);

-- Prisma's history table lives in `public`, which Supabase exposes through its
-- REST API. RLS with no policies makes it unreachable for anon/authenticated.
ALTER TABLE IF EXISTS "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
