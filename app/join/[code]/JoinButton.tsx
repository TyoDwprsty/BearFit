"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinByCode } from "@/app/actions/links";
import { useI18n } from "@/components/I18nProvider";
import { btn } from "@/components/ui";
import type { DictKey } from "@/lib/i18n";
import { useProgress } from "@/components/feedback/NavigationProgress";
import { Alert } from "@/components/feedback/Alert";

export function JoinButton({ code, label }: { code: string; label: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useProgress(pending, { page: true });
  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          start(async () => {
            const res = await joinByCode(code);
            if (res.error) setError(t(`err.${res.error}` as DictKey));
            else router.replace("/home");
          })
        }
        className={`${btn.primary} w-full`}
      >
        {label}
      </button>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
