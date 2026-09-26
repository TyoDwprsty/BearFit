"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";

/** Full-screen photo viewer. */
export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (src && !el.open) el.showModal();
    if (!src && el.open) el.close();
  }, [src]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={onClose}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-black/85"
    >
      {src && (
        <div className="flex h-full w-full items-center justify-center p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="absolute top-[max(16px,env(safe-area-inset-top))] right-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur"
          >
            <Icon name="x" size={20} />
          </button>
        </div>
      )}
    </dialog>
  );
}
