"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { markRead, sendMessage } from "@/app/actions/chat";
import { useToast } from "@/components/feedback/FeedbackProvider";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { Lightbox } from "@/components/Lightbox";
import { cn } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";
import { usePhotoUpload } from "@/lib/use-photo-upload";

/**
 * Realtime 1:1 chat between a coach and a member (Supabase Realtime).
 * The composer is pinned to the bottom of the screen; photos are compressed and
 * staged in R2 as soon as they are picked.
 */
export function ChatThread({
  me,
  otherId,
  initial,
  timezone,
  quickReplies,
  uploadEnabled,
}: {
  me: string;
  otherId: string;
  initial: Message[];
  timezone: string;
  quickReplies?: string[];
  uploadEnabled: boolean;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [viewing, setViewing] = useState<string | null>(null);
  const [, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { photo, pick, retry, clear, waitForKey } = usePhotoUpload({ enabled: uploadEnabled });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    void markRead(otherId);
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${me}:${otherId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${me}` },
        (payload: { new: Message }) => {
          const m = payload.new;
          if (m.sender_id !== otherId) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          void markRead(otherId);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me, otherId]);

  const send = (body: string) => {
    const clean = body.trim();
    const attached = photo;
    if (!clean && !attached) return;
    const temp: Message = {
      id: `temp-${crypto.randomUUID()}`,
      sender_id: me,
      recipient_id: otherId,
      body: clean,
      image_key: null,
      image_url: attached?.preview ?? null,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, temp]);
    setText("");
    start(async () => {
      let stagedKey: string | null = null;
      if (attached) {
        stagedKey = await waitForKey();
        if (!stagedKey) {
          setMessages((prev) => prev.filter((m) => m.id !== temp.id));
          setText(clean);
          toast(t("post.uploadFail"), "error");
          return;
        }
      }
      clear();
      const res = await sendMessage(otherId, clean, stagedKey);
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? (res.message ?? { ...m, id: `failed-${m.id}` }) : m)));
      if (res.error) toast(t("common.error"), "error");
    });
  };

  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", { hour: "2-digit", minute: "2-digit", timeZone: timezone });
  const dayFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: timezone });
  const rows = messages.map((m, i) => {
    const day = dayFmt.format(new Date(m.created_at));
    const prevDay = i > 0 ? dayFmt.format(new Date(messages[i - 1].created_at)) : null;
    return { m, day, showDay: day !== prevDay };
  });

  const canSend = !!text.trim() || (!!photo && photo.status !== "error");

  return (
    <>
      <div className="flex flex-col gap-1.5" aria-live="polite">
        {messages.length === 0 && <p className="py-16 text-center text-sm font-semibold text-muted">{t("chat.empty")}</p>}
        {rows.map(({ m, day, showDay }) => {
          const mine = m.sender_id === me;
          const failed = m.id.startsWith("failed-");
          const sending = m.id.startsWith("temp-");
          return (
            <div key={m.id} className="flex flex-col">
              {showDay && <span className="my-2 self-center rounded-full bg-soft px-3 py-1 text-[11px] font-bold text-muted">{day}</span>}
              <div
                className={cn(
                  "max-w-[82%] overflow-hidden rounded-[20px] text-[15px] leading-snug",
                  mine ? "self-end rounded-br-md bg-grape text-on-grape" : "self-start rounded-bl-md border border-line bg-card",
                  sending && "opacity-70",
                  failed && "bg-berry-s text-berry-d",
                )}
              >
                {m.image_url && (
                  <button type="button" onClick={() => setViewing(m.image_url)} aria-label={t("chat.viewPhoto")} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.image_url} alt="" loading="lazy" className="max-h-72 w-full min-w-44 object-cover" />
                  </button>
                )}
                <div className="px-3.5 py-2">
                  {m.body && <p className="break-words whitespace-pre-wrap">{m.body}</p>}
                  <span className={cn("mt-0.5 block text-right text-[10px] font-semibold", mine ? "opacity-80" : "text-muted")}>
                    {failed ? "!" : sending ? "…" : fmt.format(new Date(m.created_at))}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {/* Room for the fixed composer */}
        <div ref={endRef} className={cn(quickReplies?.length ? "h-44" : "h-28", photo && "h-52")} />
      </div>

      {/* Composer — pinned to the bottom of the viewport */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur lg:left-[260px]">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))]">
          {quickReplies && quickReplies.length > 0 && !photo && (
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
              {quickReplies.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="shrink-0 rounded-full border-[1.5px] border-line bg-card px-3.5 py-2 text-[13px] font-bold transition active:scale-95"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {photo && (
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.preview} alt="" className="h-14 w-14 rounded-xl object-cover" />
              <span
                className={cn(
                  "flex flex-1 items-center gap-1.5 text-xs font-bold",
                  photo.status === "error" ? "text-berry-d" : photo.status === "ready" ? "text-mint-d" : "text-muted",
                )}
              >
                {photo.status === "uploading" && <span className="h-3 w-3 animate-spin rounded-full border-2 border-grape border-t-transparent" />}
                {photo.status === "ready" && <Icon name="check" size={14} strokeWidth={3} />}
                {photo.status === "uploading" ? t("post.photoUploading") : photo.status === "ready" ? t("post.photoReady") : t("post.photoFailed")}
                {photo.status === "error" && uploadEnabled && (
                  <button type="button" onClick={retry} className="ml-1 underline">
                    {t("post.retry")}
                  </button>
                )}
              </span>
              <button
                type="button"
                onClick={clear}
                aria-label={t("chat.removePhoto")}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-soft"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canSend) send(text);
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) await pick(f).catch(() => toast(t("common.error"), "error"));
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label={t("chat.addPhoto")}
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] border-[1.5px] border-line bg-card text-grape-d transition active:scale-95"
            >
              <Icon name="camera" size={22} strokeWidth={2} />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("chat.placeholder")}
              aria-label={t("chat.placeholder")}
              maxLength={2000}
              className="h-[52px] min-w-0 flex-1 rounded-[18px] border-[1.5px] border-line bg-card px-4 text-base focus:border-grape focus:outline-none"
            />
            <button
              type="submit"
              disabled={!canSend}
              aria-label={t("common.send")}
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] bg-grape text-on-grape transition active:scale-95 disabled:opacity-50"
            >
              <Icon name="send" size={22} />
            </button>
          </form>
        </div>
      </div>

      <Lightbox src={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
