"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarSheet } from "@/components/Calendar";
import { startNavigation } from "@/components/feedback/NavigationProgress";
import { Icon } from "@/components/Icon";

/** Calendar icon button that opens the BearFit calendar and sets ?date= */
export function DatePickerButton({ value, label, max }: { value: string; label: string; max?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card text-text transition active:scale-95"
      >
        <Icon name="calendar" size={20} strokeWidth={2} />
      </button>
      <CalendarSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        value={value}
        max={max}
        onSelect={(date) => {
          setOpen(false);
          if (date === value) return;
          const q = new URLSearchParams(params.toString());
          q.set("date", date);
          startNavigation();
          router.replace(`${pathname}?${q.toString()}`, { scroll: false });
        }}
      />
    </>
  );
}
