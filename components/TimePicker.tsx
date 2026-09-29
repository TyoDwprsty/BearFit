"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Beru } from "@/components/Beru";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { Sheet } from "@/components/Sheet";
import { btn, cn } from "@/components/ui";

const ITEM = 48; // px per row
const VISIBLE = 5; // rows shown; the middle one is selected
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const pad = (n: number) => String(n).padStart(2, "0");

function parse(value: string): [number, number] {
  const [h, m] = value.split(":").map(Number);
  return [Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0];
}

/** One scroll-snapping column of the time wheel. */
function Wheel({ items, value, onChange, label }: { items: number[]; value: number; onChange: (v: number) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const id = useId();
  const index = Math.max(0, items.indexOf(value));

  // Follow external changes (first open, "Now"). Deferred a frame so the
  // parent <dialog> is already open and the column has a layout.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const el = ref.current;
      if (el && Math.round(el.scrollTop / ITEM) !== index) {
        el.scrollTo({ top: index * ITEM, behavior: mounted.current ? "smooth" : "instant" });
      }
      mounted.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [index]);

  const scrollTo = (i: number) => ref.current?.scrollTo({ top: Math.min(items.length - 1, Math.max(0, i)) * ITEM, behavior: "smooth" });

  return (
    <div
      ref={ref}
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-activedescendant={`${id}-${value}`}
      onScroll={(e) => {
        const i = Math.min(items.length - 1, Math.max(0, Math.round(e.currentTarget.scrollTop / ITEM)));
        if (items[i] !== value) onChange(items[i]);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") scrollTo(index + 1);
        else if (e.key === "ArrowUp") scrollTo(index - 1);
        else return;
        e.preventDefault();
      }}
      style={{ height: ITEM * VISIBLE, paddingBlock: ITEM * Math.floor(VISIBLE / 2), scrollbarWidth: "none" }}
      className="relative w-20 snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-2xl focus-visible:outline-2 focus-visible:outline-grape [mask-image:linear-gradient(to_bottom,transparent,black_35%,black_65%,transparent)] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((n) => (
        <div
          key={n}
          id={`${id}-${n}`}
          role="option"
          aria-selected={n === value}
          onClick={() => scrollTo(items.indexOf(n))}
          style={{ height: ITEM }}
          className={cn(
            "flex cursor-pointer snap-center items-center justify-center font-display font-semibold tabular-nums transition-all",
            n === value ? "text-[34px] text-grape-d" : "text-[24px] text-muted",
          )}
        >
          {pad(n)}
        </div>
      ))}
    </div>
  );
}

/** BearFit hour/minute wheel. `value` is "HH:MM" (24h). */
export function TimePicker({ value, onSelect }: { value: string; onSelect: (time: string) => void }) {
  const { t } = useI18n();
  const [initH, initM] = parse(value);
  const [hour, setHour] = useState(initH);
  const [minute, setMinute] = useState(initM);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-[22px] bg-sun-s px-3 py-2">
        <Beru pose="alarm" size={48} />
        <span aria-live="polite" className="font-display text-[32px] leading-none font-semibold tabular-nums">
          {pad(hour)}:{pad(minute)}
        </span>
      </div>

      <div className="relative flex items-center justify-center gap-2">
        <span aria-hidden className="pointer-events-none absolute inset-x-6 top-1/2 h-12 -translate-y-1/2 rounded-2xl bg-grape-s" />
        <Wheel items={HOURS} value={hour} onChange={setHour} label={t("time.hour")} />
        <span aria-hidden className="relative pb-1 font-display text-[34px] font-semibold text-grape-d">
          :
        </span>
        <Wheel items={MINUTES} value={minute} onChange={setMinute} label={t("time.minute")} />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            setHour(now.getHours());
            setMinute(now.getMinutes());
          }}
          className={cn(btn.outline, "h-12 px-4 text-base")}
        >
          <Icon name="clock" size={18} />
          {t("time.now")}
        </button>
        <button type="button" onClick={() => onSelect(`${pad(hour)}:${pad(minute)}`)} className={cn(btn.primary, "h-12 flex-1 text-base")}>
          {t("time.set")}
        </button>
      </div>
    </div>
  );
}

/** Time picker inside the BearFit bottom sheet / dialog. */
export function TimeSheet({
  open,
  onClose,
  title,
  value,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onSelect: (time: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {/* Remount per opening so the wheels start at the current value. */}
      <TimePicker key={value} value={value} onSelect={onSelect} />
    </Sheet>
  );
}

/** Button showing "HH:MM" that opens the BearFit time picker instead of the native one. */
export function TimeField({
  value,
  onChange,
  label,
  disabled,
  className,
}: {
  value: string;
  onChange: (time: string) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" disabled={disabled} aria-label={`${label}: ${value}`} onClick={() => setOpen(true)} className={cn("tabular-nums", className)}>
        {value}
      </button>
      <TimeSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        value={value}
        onSelect={(time) => {
          onChange(time);
          setOpen(false);
        }}
      />
    </>
  );
}
