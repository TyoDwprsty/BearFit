import { FOOD_ART_BY_MEAL, FoodArt } from "@/components/FoodArt";
import { cn } from "@/components/ui";
import type { Meal } from "@/lib/types";

/** Meal photo from R2, or the design's food illustration when there's no photo. */
export function MealPhoto({
  meal,
  className,
  artSize = 84,
}: {
  meal: Pick<Meal, "photo_url" | "meal_type" | "caption">;
  className?: string;
  artSize?: number;
}) {
  const art = FOOD_ART_BY_MEAL[meal.meal_type];
  if (meal.photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={meal.photo_url} alt={meal.caption || ""} loading="lazy" className={cn("object-cover", className)} />
    );
  }
  return (
    <div className={cn("flex items-center justify-center", art.bg, className)}>
      <FoodArt kind={art.kind} size={artSize} />
    </div>
  );
}
