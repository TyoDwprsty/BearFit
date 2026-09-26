"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Beru, type BeruPose } from "@/components/Beru";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { btn, cn } from "@/components/ui";

/**
 * BearFit-themed replacements for window.confirm / window.alert.
 *   const confirm = useConfirm();  if (await confirm({ title, danger: true })) …
 *   const toast = useToast();      toast("Tersimpan!", "success")
 */

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  pose?: BeruPose;
}

type ToastTone = "success" | "error" | "info";
interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
}

const FeedbackContext = createContext<{
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  toast: (text: string, tone?: ToastTone) => void;
} | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const confirm = useCallback(
    (o: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })),
    [],
  );

  const toast = useCallback((text: string, tone: ToastTone = "success") => {
    const id = ++seq.current;
    setToasts((list) => [...list.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 3200);
  }, []);

  const close = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <FeedbackContext value={{ confirm, toast }}>
      {children}
      <ConfirmDialog options={pending} onClose={close} />
      <div className="pointer-events-none fixed inset-x-0 top-[max(16px,env(safe-area-inset-top))] z-[70] flex flex-col items-center gap-2 px-4">
        {toasts.map((x) => (
          <div
            key={x.id}
            role="status"
            className={cn(
              "animate-rise pointer-events-auto flex max-w-md items-center gap-2.5 rounded-[18px] px-4 py-3 text-sm font-bold shadow-float",
              x.tone === "success" && "bg-mint text-ink",
              x.tone === "error" && "bg-berry text-ink",
              x.tone === "info" && "bg-text text-bg",
            )}
          >
            <Icon name={x.tone === "success" ? "check" : x.tone === "error" ? "x" : "bell"} size={18} strokeWidth={2.6} />
            {x.text}
          </div>
        ))}
      </div>
    </FeedbackContext>
  );
}

function ConfirmDialog({
  options,
  onClose,
}: {
  options: ConfirmOptions | null;
  onClose: (value: boolean) => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (options && !el.open) el.showModal();
    if (!options && el.open) el.close();
  }, [options]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose(false);
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(false);
      }}
      className="m-auto w-[calc(100%-32px)] max-w-sm rounded-[32px] bg-bg p-0 text-text backdrop:bg-ink/55 backdrop:backdrop-blur-[2px]"
    >
      {options && (
        <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-5 text-center">
          <span className={cn("flex h-[104px] w-[104px] items-center justify-center rounded-full", options.danger ? "bg-berry-s" : "bg-sun-s")}>
            <Beru pose={options.pose ?? (options.danger ? "alarm" : "wave")} size={96} />
          </span>
          <h2 className="font-display text-[22px] leading-tight font-semibold">{options.title}</h2>
          {options.message && <p className="text-sm leading-relaxed text-muted">{options.message}</p>}
          <div className="mt-2 grid w-full grid-cols-2 gap-2">
            <button type="button" onClick={() => onClose(false)} className={cn(btn.outline, "h-12 text-base")}>
              {options.cancelLabel ?? t("common.cancel")}
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => onClose(true)}
              className={cn(btn.primary, "h-12 text-base", options.danger && "bg-berry text-ink")}
            >
              {options.confirmLabel ?? t("common.confirm")}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

export function useConfirm() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useConfirm must be used inside <FeedbackProvider>");
  return ctx.confirm;
}

export function useToast() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useToast must be used inside <FeedbackProvider>");
  return ctx.toast;
}
