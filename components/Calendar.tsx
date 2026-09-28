"use client";

import { useState } from "react";
import { Beru } from "@/components/Beru";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { Sheet } from "@/components/Sheet";
import { btn, cn } from "@/components/ui";
import { addDays, formatLongDate, formatMonthYear, todayIn, weekdayShort, weekStart } from "@/lib/dates";

const firstOfMonth = (d: string) => `${d.slice(0, 7)}-01`;

function shiftMonth(first: string, n: number) {
  const [y, m] = first.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return dt.toISOString().slice(0, 10);
}

function browserToday() {
  return todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/** BearFit month calendar (Mon–Sun). Dates are "YYYY-MM-DD" strings. */
export function Calendar({
  value,
  onSelect,
  min,
  max,
}: {
  value: string;
  onSelect: (date: string) => void;
  min?: string;
  max?: string;
}) {
  const { t, locale } = useI18n();
  const [month, setMonth] = useState(firstOfMonth(value));
  const today = browserToday();

  const start = weekStart(month);
  const nextMonth = shiftMonth(month, 1);
  const cells: string[] = [];
  for (let d = start; d < nextMonth || cells.length % 7 !== 0; d = addDays(d, 1)) cells.push(d);

  const out = (d: string) => (!!min && d < min) || (!!max && d > max);
  const canPrev = !min || firstOfMonth(min) < month;
  const canNext = !max || nextMonth <= max;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-[22px] bg-sun-s px-3 py-2">
        <Beru pose="wave" size={48} />
        <span className="font-display text-lg leading-tight font-semibold">{formatLongDate(value, locale)}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={t("cal.prev")}
          disabled={!canPrev}
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card transition active:scale-95 disabled:opacity-40"
        >
          <Icon name="back" size={20} />
        </button>
        <span aria-live="polite" className="font-display text-xl font-semibold capitalize">
          {formatMonthYear(month, locale)}
        </span>
        <button
          type="button"
          aria-label={t("cal.next")}
          disabled={!canNext}
          onClick={() => setMonth(nextMonth)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card transition active:scale-95 disabled:opacity-40"
        >
          <Icon name="chevron" size={20} />
        </button>
      </div>

      <div role="grid" className="grid grid-cols-7 gap-1">
        {cells.slice(0, 7).map((d) => (
          <span key={`h-${d}`} role="columnheader" className="pb-1 text-center text-[11px] font-extrabold text-muted uppercase">
            {weekdayShort(d, locale)}
          </span>
        ))}
        {cells.map((d) => {
          const inMonth = d.slice(0, 7) === month.slice(0, 7);
          const selected = d === value;
          const isToday = d === today;
          const disabled = out(d);
          return (
            <button
              key={d}
              type="button"
              role="gridcell"
              disabled={disabled}
              aria-selected={selected}
              aria-label={formatLongDate(d, locale)}
              onClick={() => onSelect(d)}
              className={cn(
                "relative flex aspect-square min-w-0 items-center justify-center rounded-2xl font-display text-[17px] font-semibold transition active:scale-90",
                selected ? "bg-grape text-on-grape shadow-float" : isToday ? "bg-mango-s text-mango-d" : "hover:bg-soft",
                !inMonth && !selected && "text-muted/50",
                disabled && "pointer-events-none opacity-30",
              )}
            >
              {Number(d.slice(8))}
              {isToday && !selected && <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-mango" />}
            </button>
          );
        })}
      </div>

      {!out(today) && today !== value && (
        <button type="button" onClick={() => onSelect(today)} className={cn(btn.outline, "h-12 text-base")}>
          <Icon name="calendar" size={18} />
          {t("common.today")}
        </button>
      )}
    </div>
  );
}

/** Calendar inside the BearFit bottom sheet / dialog. */
export function CalendarSheet({
  open,
  onClose,
  title,
  ...props
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onSelect: (date: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {/* Remount per opening so the view jumps back to the selected month. */}
      <Calendar key={props.value} {...props} />
    </Sheet>
  );
}
