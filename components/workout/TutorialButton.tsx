"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { Sheet } from "@/components/Sheet";
import { btn, cn } from "@/components/ui";

/** YouTube id from watch / youtu.be / shorts / embed URLs. */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{6,})/);
      return m ? m[2] : null;
    }
  } catch {
    // not a URL
  }
  return null;
}

/** Small "Tutorial" pill; YouTube plays in a sheet, other links open externally. */
export function TutorialButton({ url, title, className }: { url: string; title: string; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const yt = youtubeId(url);

  const pill = cn(
    "inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full bg-berry-s px-2.5 text-xs font-extrabold text-berry-d transition active:scale-95",
    className,
  );

  if (!yt) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={pill} onClick={(e) => e.stopPropagation()}>
        <PlayGlyph /> {t("exercises.tutorial")}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        className={pill}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <PlayGlyph /> {t("exercises.tutorial")}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className="aspect-video w-full overflow-hidden rounded-[20px] bg-ink">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&playsinline=1`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className={cn(btn.small, "self-start border border-line")}>
          <Icon name="share" size={16} />
          {t("exercises.openVideo")}
        </a>
      </Sheet>
    </>
  );
}

function PlayGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
    </svg>
  );
}
