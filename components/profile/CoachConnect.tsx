"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { endLink, joinByCode, requestCoach, searchCoaches } from "@/app/actions/links";
import { Icon } from "@/components/Icon";
import { useConfirm } from "@/components/feedback/FeedbackProvider";
import { useI18n } from "@/components/I18nProvider";
import { Avatar, btn, cn, input } from "@/components/ui";
import type { DictKey } from "@/lib/i18n";
import { useProgress } from "@/components/feedback/NavigationProgress";
import { Alert } from "@/components/feedback/Alert";

type CoachHit = { id: string; full_name: string; avatar_url: string | null; coach_bio: string | null };

/** Member side: join via invite code, or search & request a coach. */
export function CoachConnect({ pending }: { pending: { linkId: string; coach: CoachHit }[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CoachHit[] | null>(null);
  const [requested, setRequested] = useState<Set<string>>(new Set(pending.map((p) => p.coach.id)));
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, start] = useTransition();
  useProgress(busy);

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          start(async () => {
            const res = await joinByCode(code);
            if (res.error) setMsg({ tone: "err", text: t(`err.${res.error}` as DictKey) || t("common.error") });
            else router.refresh();
          });
        }}
      >
        <label htmlFor="coach-code" className="text-sm font-bold">
          {t("profile.joinCode")}
        </label>
        <div className="flex gap-2">
          <input
            id="coach-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("profile.codePh")}
            maxLength={12}
            autoCapitalize="characters"
            className={cn(input, "font-display tracking-[0.2em] uppercase")}
          />
          <button type="submit" disabled={busy || code.trim().length < 4} aria-busy={busy} className={cn(btn.primary, "h-auto shrink-0 px-5 text-base")}>
            {t("profile.join")}
          </button>
        </div>
      </form>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => setResults(await searchCoaches(query)));
        }}
      >
        <label htmlFor="coach-search" className="text-sm font-bold">
          {t("profile.searchCoach")}
        </label>
        <div className="flex gap-2">
          <input
            id="coach-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("profile.searchPh")}
            className={input}
          />
          <button
            type="submit"
            disabled={busy || query.trim().length < 2}
            aria-label={t("profile.searchCoach")}
            className="flex w-14 shrink-0 items-center justify-center rounded-[18px] border-[1.5px] border-line bg-card"
          >
            <Icon name="search" size={20} />
          </button>
        </div>
      </form>

      {results && (
        <ul className="flex flex-col gap-2">
          {results.length === 0 && <li className="text-sm text-muted">{t("profile.noResults")}</li>}
          {results.map((c) => {
            const isRequested = requested.has(c.id);
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-[20px] border border-line bg-card p-3">
                <Avatar name={c.full_name} src={c.avatar_url} accent="grape" size={44} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold">{c.full_name}</span>
                  {c.coach_bio && <span className="line-clamp-2 text-xs text-muted">{c.coach_bio}</span>}
                </div>
                <button
                  type="button"
                  disabled={busy || isRequested}
                  onClick={() =>
                    start(async () => {
                      const res = await requestCoach(c.id);
                      if (!res?.error) setRequested((s) => new Set(s).add(c.id));
                      else setMsg({ tone: "err", text: t(`err.${res.error}` as DictKey) || t("common.error") });
                    })
                  }
                  className={cn(btn.small, isRequested ? "bg-sun-s text-sun-d" : "bg-grape text-on-grape")}
                >
                  {isRequested ? t("profile.requested") : t("profile.request")}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {pending.length > 0 && (
        <ul className="flex flex-col gap-2">
          {pending.map((p) => (
            <li key={p.linkId} className="flex items-center gap-3 rounded-[20px] bg-sun-s p-3">
              <Avatar name={p.coach.full_name} src={p.coach.avatar_url} accent="grape" size={40} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-bold">{p.coach.full_name}</span>
                <span className="text-xs font-bold text-sun-d">{t("profile.requested")}</span>
              </div>
              <button type="button" disabled={busy} onClick={() => start(() => endLink(p.linkId))} className={btn.ghost}>
                {t("profile.cancelRequest")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {msg && (
        <Alert tone={msg.tone === "err" ? "error" : "success"}>{msg.text}</Alert>
      )}
    </div>
  );
}

export function LeaveCoachButton({ linkId }: { linkId: string }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const [busy, start] = useTransition();
  useProgress(busy);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (await confirm({ title: t("profile.endConfirm"), confirmLabel: t("profile.endCoach"), danger: true })) {
          start(() => endLink(linkId));
        }
      }}
      className={cn(btn.ghost, "text-berry-d")}
    >
      {t("profile.endCoach")}
    </button>
  );
}
