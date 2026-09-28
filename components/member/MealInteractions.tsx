"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { addMealComment, deleteMeal, toggleMealLike } from "@/app/actions/meals";
import { Icon } from "@/components/Icon";
import { useConfirm, useToast } from "@/components/feedback/FeedbackProvider";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import { useProgress } from "@/components/feedback/NavigationProgress";

export function LikeButton({ mealId, liked }: { mealId: string; liked: boolean }) {
  const { t } = useI18n();
  const [optimistic, setOptimistic] = useOptimistic(liked);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          await toggleMealLike(mealId);
        })
      }
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition active:scale-95",
        optimistic ? "bg-berry-s text-berry-d" : "border border-line text-muted",
      )}
    >
      <Icon name={optimistic ? "heart" : "heartLine"} size={14} strokeWidth={2.2} />
      {optimistic ? t("food.youLiked") : t("food.like")}
    </button>
  );
}

export function CommentForm({ mealId, placeholder }: { mealId: string; placeholder?: string }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  useProgress(pending);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const text = value.trim();
        if (!text) return;
        start(async () => {
          const res = await addMealComment(mealId, text);
          if (!res?.error) setValue("");
          ref.current?.focus();
        });
      }}
      className="flex items-center gap-2"
    >
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? t("food.reply")}
        aria-label={placeholder ?? t("food.reply")}
        maxLength={1000}
        className="h-11 min-w-0 flex-1 rounded-2xl border-[1.5px] border-line bg-card px-3.5 text-base focus:border-grape focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending || !value.trim()}
        aria-label={t("common.send")}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-grape text-on-grape transition active:scale-95 disabled:opacity-50"
      >
        <Icon name="send" size={18} />
      </button>
    </form>
  );
}

export function DeleteMealButton({ mealId }: { mealId: string }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const toast = useToast();
  const [pending, start] = useTransition();
  useProgress(pending);
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={t("common.delete")}
      onClick={async () => {
        const ok = await confirm({ title: t("food.deleteConfirm"), confirmLabel: t("common.delete"), danger: true, pose: "eat" });
        if (!ok) return;
        start(async () => {
          await deleteMeal(mealId);
          toast(t("common.deleted"));
        });
      }}
      className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-soft active:scale-95"
    >
      <Icon name="trash" size={17} />
    </button>
  );
}
