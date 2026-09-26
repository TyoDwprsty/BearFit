import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MealPostData } from "@/components/member/MealPost";
import type { Meal, MealComment, MealLike, ProfileLite } from "@/lib/types";

/** Loads comments, likes and involved profiles for a list of meals. */
export async function hydrateMeals(db: SupabaseClient, meals: Meal[], extraPeople: string[] = []) {
  const ids = meals.map((m) => m.id);
  const [{ data: comments }, { data: likes }] = ids.length
    ? await Promise.all([
        db.from("meal_comments").select("*").in("meal_id", ids).order("created_at"),
        db.from("meal_likes").select("meal_id, user_id").in("meal_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  const posts: MealPostData[] = meals.map((meal) => ({
    meal,
    comments: ((comments ?? []) as MealComment[]).filter((c) => c.meal_id === meal.id),
    likedBy: ((likes ?? []) as MealLike[]).filter((l) => l.meal_id === meal.id).map((l) => l.user_id),
  }));

  const personIds = new Set<string>(extraPeople);
  meals.forEach((m) => personIds.add(m.user_id));
  (comments ?? []).forEach((c) => personIds.add(c.author_id));
  const { data: profiles } = personIds.size
    ? await db.from("profiles").select("id, full_name, avatar_url").in("id", [...personIds])
    : { data: [] };
  const people = new Map<string, ProfileLite>(((profiles ?? []) as ProfileLite[]).map((p) => [p.id, p]));

  return { posts, people };
}
