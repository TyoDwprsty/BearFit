"use client";

import { useState, useTransition } from "react";
import { sendMessage } from "@/app/actions/chat";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import { useProgress } from "@/components/feedback/NavigationProgress";

/** "Kirim semangat cepat" — quick encouragement chips + note, sent as a chat message. */
export function QuickNote({ memberId, memberName }: { memberId: string; memberName: string }) {
  const { t } = useI18n();
  const quick = [t("coach.quick.1"), t("coach.quick.2"), t("coach.quick.3"), t("coach.quick.4")];
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  useProgress(pending);

  const send = () =>
    start(async () => {
      const res = await sendMessage(memberId, msg);
      if (!res.error) {
        setMsg("");
        setSent(true);
        window.setTimeout(() => setSent(false), 2000);
      }
    });

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="font-display text-[19px] font-semibold">{t("coach.quick")}</h2>
      <div className="flex flex-wrap gap-2">
        {quick.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setMsg(q)}
            className={cn(
              "min-h-11 rounded-full border-[1.5px] px-3.5 text-[13px] font-bold transition",
              msg === q ? "border-grape bg-grape-s text-grape-d" : "border-line bg-card",
            )}
          >
            {q}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (msg.trim()) send();
        }}
        className="flex items-center gap-2"
      >
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder={t("coach.notePh", { name: memberName })}
          aria-label={t("coach.notePh", { name: memberName })}
          className="h-[52px] min-w-0 flex-1 rounded-[18px] border-[1.5px] border-line bg-card px-4 text-base focus:border-grape focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !msg.trim()}
          aria-label={t("coach.noteSend")}
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] bg-grape text-on-grape transition active:scale-95 disabled:opacity-50"
        >
          <Icon name={sent ? "check" : "send"} size={22} />
        </button>
      </form>
    </section>
  );
}
