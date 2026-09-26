"use client";

import { useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";

/** Calendar icon button that opens the native date picker and sets ?date= */
export function DatePickerButton({ value, label, max }: { value: string; label: string; max?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <span className="relative">
      <button
        type="button"
        aria-label={label}
        onClick={() => {
          const el = ref.current;
          if (!el) return;
          if (typeof el.showPicker === "function") el.showPicker();
          else el.click();
        }}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card text-text transition active:scale-95"
      >
        <Icon name="calendar" size={20} strokeWidth={2} />
      </button>
      <input
        ref={ref}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value}
        max={max}
        onChange={(e) => {
          if (!e.target.value) return;
          const q = new URLSearchParams(params.toString());
          q.set("date", e.target.value);
          router.replace(`${pathname}?${q.toString()}`, { scroll: false });
        }}
        className="pointer-events-none absolute right-0 bottom-0 h-0 w-0 opacity-0"
      />
    </span>
  );
}
