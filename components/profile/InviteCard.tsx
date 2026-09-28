"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { btn, cn } from "@/components/ui";

/** Coach invite code with copy & native share. */
export function InviteCard({ code }: { code: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const text = t("profile.inviteShareText", { code });
  // Built from the domain the user is on, so production, preview & local links all work.
  const joinLink = () => `${window.location.origin}/join/${code}`;

  return (
    <div className="flex flex-col gap-3 rounded-[24px] bg-grape p-[18px] text-on-grape">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-extrabold tracking-wide uppercase opacity-90">{t("profile.inviteTitle")}</span>
        <span className="font-display text-[40px] leading-none font-bold tracking-[0.18em]">{code}</span>
        <span className="text-[13px] leading-snug opacity-90">{t("profile.inviteBody")}</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(joinLink());
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            } catch {
              // clipboard blocked
            }
          }}
          className={cn(btn.small, "flex-1")}
        >
          <Icon name={copied ? "check" : "copy"} size={16} />
          {copied ? t("common.copied") : t("common.copy")}
        </button>
        <button
          type="button"
          onClick={async () => {
            if (navigator.share) {
              await navigator.share({ title: "BearFit", text, url: joinLink() }).catch(() => {});
            } else {
              await navigator.clipboard?.writeText(`${text} ${joinLink()}`).catch(() => {});
              setCopied(true);
            }
          }}
          className={cn(btn.small, "flex-1 bg-mango text-ink")}
        >
          <Icon name="share" size={16} />
          {t("common.share")}
        </button>
      </div>
    </div>
  );
}
