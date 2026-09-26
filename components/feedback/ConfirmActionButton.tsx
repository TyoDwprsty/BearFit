"use client";

import { useTransition } from "react";
import type { BeruPose } from "@/components/Beru";
import { useConfirm, useToast } from "./FeedbackProvider";

/** Button that asks with the BearFit confirm dialog, then runs a (bound) server action. */
export function ConfirmActionButton({
  action,
  title,
  message,
  confirmLabel,
  danger = true,
  pose,
  successText,
  className,
  children,
}: {
  action: () => Promise<unknown>;
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  pose?: BeruPose;
  successText?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={async () => {
        if (!(await confirm({ title, message, confirmLabel, danger, pose }))) return;
        start(async () => {
          await action();
          if (successText) toast(successText);
        });
      }}
    >
      {children}
    </button>
  );
}
