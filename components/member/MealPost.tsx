import { Icon } from "@/components/Icon";
import { Avatar, Chip } from "@/components/ui";
import { formatClock } from "@/lib/dates";
import { firstName, round1 } from "@/lib/format";
import type { DictKey, TFunction } from "@/lib/i18n";
import type { Locale, Meal, MealComment, ProfileLite } from "@/lib/types";
import { CommentForm, DeleteMealButton, LikeButton } from "./MealInteractions";
import { MealPhoto } from "./MealPhoto";

export interface MealPostData {
  meal: Meal;
  comments: MealComment[];
  likedBy: string[];
}

/** A meal post card (design: 03 · Catatan Makan). */
export function MealPost({
  data,
  owner,
  viewerId,
  people,
  coachId,
  t,
  tz,
  locale,
  showOwner,
}: {
  data: MealPostData;
  owner: ProfileLite;
  viewerId: string;
  people: Map<string, ProfileLite>;
  coachId: string | null;
  t: TFunction;
  tz: string;
  locale: Locale;
  /** Community feed: lead with the poster's name. */
  showOwner?: boolean;
}) {
  const { meal, comments, likedBy } = data;
  const isOwner = viewerId === meal.user_id;
  const coachLiked = coachId ? likedBy.includes(coachId) : false;
  const coachResponded = coachLiked || comments.some((c) => c.author_id === coachId);
  const hasMacros = meal.calories != null;

  return (
    <article className="animate-rise flex flex-col gap-3 rounded-[26px] border border-line bg-card p-3.5">
      <header className="flex items-center gap-2.5">
        <Avatar name={owner.full_name} src={owner.avatar_url} id={owner.id} size={38} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-bold">
            {showOwner && <>{isOwner ? t("chat.you") : firstName(owner.full_name)} · </>}
            {t(`meal.${meal.meal_type}` as DictKey)}
          </span>
          <span className="text-xs font-medium text-muted">
            {formatClock(meal.eaten_at, tz, locale)} · {t("portion.label", { p: t(`portion.${meal.portion}` as DictKey).toLowerCase() })}
          </span>
        </div>
        <Chip accent="mint">{t("food.logged")}</Chip>
        {isOwner && <DeleteMealButton mealId={meal.id} />}
      </header>

      <MealPhoto meal={meal} className="h-[180px] w-full rounded-[20px] sm:h-[240px]" artSize={160} />

      {meal.caption && <p className="text-sm leading-relaxed">{meal.caption}</p>}

      {hasMacros && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-soft px-3 py-2">
          <span className="font-display text-lg font-semibold">
            {meal.calories} <span className="text-xs font-bold text-muted">{t("common.kcal")}</span>
          </span>
          <span className="text-xs font-bold text-muted">
            P {round1(meal.protein_g)}g · {t("macro.carbs").charAt(0)} {round1(meal.carbs_g)}g · {t("macro.fat").charAt(0)} {round1(meal.fat_g)}g
          </span>
          {meal.ai_estimated && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-grape-s px-2 py-0.5 text-[11px] font-extrabold text-grape-d">
              <Icon name="sparkle" size={12} /> {t("food.aiBadge")}
            </span>
          )}
        </div>
      )}

      {meal.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {meal.tags.map((tag) => (
            <Chip key={tag}>{t(`tag.${tag}` as DictKey)}</Chip>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 border-t border-line pt-2.5 text-xs font-bold">
        {!meal.share_with_coach ? (
          <span className="flex items-center gap-1.5 text-muted">
            <Icon name="lock" size={15} /> {t("food.private")}
          </span>
        ) : !isOwner ? (
          <span className="flex items-center gap-2">
            <LikeButton mealId={meal.id} liked={likedBy.includes(viewerId)} />
            {likedBy.filter((id) => id !== viewerId).length > 0 && (
              <span className="font-semibold text-muted">{t("food.likesN", { n: likedBy.filter((id) => id !== viewerId).length })}</span>
            )}
          </span>
        ) : coachLiked ? (
          <span className="flex items-center gap-1.5 text-berry-d">
            <Icon name="heart" size={16} />
            {t("food.coachLiked", { name: `${t("common.coach")} ${firstName(people.get(coachId!)?.full_name)}` })}
          </span>
        ) : likedBy.length > 0 ? (
          <span className="flex items-center gap-1.5 text-berry-d">
            <Icon name="heart" size={16} />
            {t("food.likesN", { n: likedBy.length })}
          </span>
        ) : coachId && !coachResponded ? (
          <span className="flex items-center gap-1.5 font-semibold text-muted">
            <Icon name="chat" size={15} strokeWidth={2} /> {t("food.waiting")}
          </span>
        ) : null}
      </div>

      {comments.map((c) => {
        const author = people.get(c.author_id);
        return (
          <div key={c.id} className="flex gap-2.5 rounded-2xl bg-soft px-3 py-2.5">
            <Avatar name={author?.full_name} src={author?.avatar_url} id={c.author_id} accent={c.author_id === coachId ? "grape" : undefined} size={28} />
            <span className="text-[13px] leading-normal">
              <strong>{c.author_id === viewerId ? t("chat.you") : firstName(author?.full_name)}</strong> {c.body}
            </span>
          </div>
        );
      })}

      {meal.share_with_coach && (coachId || !isOwner) && (
        <CommentForm mealId={meal.id} placeholder={isOwner ? t("food.reply") : t("food.comment")} />
      )}
    </article>
  );
}
