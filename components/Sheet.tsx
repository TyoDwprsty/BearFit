"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { useBackToClose } from "@/lib/use-back-nav";

/** Bottom sheet on phones, centered dialog on desktop. Uses native <dialog>. */
export function Sheet({
  open,
  onClose,
  title,
  onBack,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Back gesture / Esc inside the sheet (e.g. to a previous step). Return true to keep it open. */
  onBack?: () => boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  useBackToClose(open, onClose);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        // Android's back gesture reaches an open <dialog> as `cancel` before any history change.
        if (e.target === e.currentTarget && onBack?.()) e.preventDefault();
      }}
      onClose={(e) => {
        // React bubbles `close` from nested sheets (e.g. a picker inside a form sheet).
        if (e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-[32px] bg-bg p-0 text-text backdrop:bg-ink/50 sm:m-auto sm:max-w-lg sm:rounded-[32px]"
    >
      <div className="flex flex-col gap-4 px-5 pt-3 pb-[max(24px,env(safe-area-inset-bottom))]">
        <span className="mx-auto h-1.5 w-12 rounded-full bg-line sm:hidden" />
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[22px] font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-card"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        {open && children}
      </div>
    </dialog>
  );
}
