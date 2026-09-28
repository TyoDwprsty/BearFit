-- Programs can repeat every week with no end: weeks = NULL.
-- (The existing CHECK (weeks BETWEEN 1 AND 52) still applies to non-null values.)

-- AlterTable
ALTER TABLE "public"."programs" ALTER COLUMN "weeks" DROP NOT NULL;
