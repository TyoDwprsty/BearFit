-- Members can ask their coach to fill in a day's workout ("minta porsi latihan").
-- Set by the member, cleared when the coach saves the plan.

-- AlterTable
ALTER TABLE "public"."workout_plans" ADD COLUMN "requested_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "workout_plans_requested" ON "public"."workout_plans"("member_id", "plan_date") WHERE ("requested_at" IS NOT NULL);
