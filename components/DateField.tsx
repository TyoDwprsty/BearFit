"use client";

import { useState } from "react";
import { CalendarSheet } from "@/components/Calendar";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import { formatShortDate } from "@/lib/dates";

/** Form date input (submits `name=YYYY-MM-DD`) using the BearFit calendar instead of the native picker. */
export function DateField({
  name,
  defaultValue,
  label,
  min,
  max,
  className,
}: {
  name: string;
  defaultValue: string;
  label: string;
  min?: string;
  max?: string;
  className?: string;
}) {
  const { locale } = useI18n();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-label={`${label}: ${formatShortDate(value, locale)}`}
        onClick={() => setOpen(true)}
        className={cn("inline-flex items-center gap-2", className)}
      >
        <Icon name="calendar" size={18} className="shrink-0 text-grape-d" />
        <span className="truncate">{formatShortDate(value, locale)}</span>
      </button>
      <CalendarSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        value={value}
        min={min}
        max={max}
        onSelect={(d) => {
          setValue(d);
          setOpen(false);
        }}
      />
    </>
  );
}
