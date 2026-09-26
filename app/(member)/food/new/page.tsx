import { BackHeader } from "@/components/ui";
import { getActiveCoach, requireViewer } from "@/lib/auth";
import { isValidDateStr, localParts, todayIn } from "@/lib/dates";
import { isGroqConfigured, isR2Configured } from "@/lib/env";
import { firstName, mealTypeForHour, MEAL_TYPES } from "@/lib/format";
import { makeT } from "@/lib/i18n";
import { PostMealForm } from "./PostMealForm";

export const metadata = { title: "Posting Makanan" };

export default async function NewMealPage({ searchParams }: PageProps<"/food/new">) {
  const viewer = await requireViewer("member");
  const { profile } = viewer;
  const t = makeT(profile.locale);
  const params = await searchParams;
  const today = todayIn(profile.timezone);
  const date = isValidDateStr(params.date as string) && (params.date as string) <= today ? (params.date as string) : today;
  const now = localParts(new Date(), profile.timezone);
  const type = MEAL_TYPES.find((m) => m === params.type) ?? mealTypeForHour(now.hour);
  const coach = await getActiveCoach(viewer);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-[18px]">
      <BackHeader href={`/food${date !== today ? `?date=${date}` : ""}`} backLabel={t("post.backToLog")} title={t("post.title")} />
      <PostMealForm
        defaultType={type}
        date={date}
        defaultTime={`${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}`}
        coachName={coach ? `${t("common.coach")} ${firstName(coach.full_name)}` : null}
        aiEnabled={isGroqConfigured()}
        uploadEnabled={isR2Configured()}
      />
    </div>
  );
}
