-- New workout category "sport" (padel, tennis, futsal…), listed first.
-- Its own migration: a new enum value can't be used in the transaction that adds it.

-- AlterEnum
ALTER TYPE "public"."exercise_category" ADD VALUE IF NOT EXISTS 'sport' BEFORE 'cardio';
