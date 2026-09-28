import Link from "next/link";
import { cn } from "@/components/ui";
import { weekdayShort } from "@/lib/dates";

export type DayMark = "done" | "planned";

const ON = {
  mango: { cell: "border-mango bg-mango text-ink", dot: "bg-ink" },
  grape: { cell: "border-grape bg-grape text-on-grape", dot: "bg-on-grape" },
} as const;

const MARK: Record<DayMark, string> = { done: "bg-mint", planned: "bg-grape" };

/**
 * Mon–Sun day picker (?date=) with a dot per day, used by Food & Workout.
 * `maxDate` disables later days (e.g. no meals in the future).
 */
export function WeekStrip({
  days,
  selected,
  hrefFor,
  locale,
  marks,
  maxDate,
  accent = "mango",
}: {
  days: string[];
  selected: string;
  hrefFor: (date: string) => string;
  locale: string;
  marks: Partial<Record<string, DayMark>>;
  maxDate?: string;
  accent?: keyof typeof ON;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const on = d === selected;
        const disabled = !!maxDate && d > maxDate;
        const mark = marks[d];
        const cls = cn(
          "flex h-[66px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[18px] border transition",
          on ? ON[accent].cell : "border-line bg-card",
          !on && (mark ? "text-text" : "text-muted"),
          disabled && "opacity-50",
        );
        const inner = (
          <>
            <span className="text-[11px] font-bold">{weekdayShort(d, locale)}</span>
            <span className="font-display text-lg font-semibold">{Number(d.slice(8))}</span>
            <span className={cn("h-[5px] w-[5px] rounded-full", on ? ON[accent].dot : mark ? MARK[mark] : "bg-transparent")} />
          </>
        );
        return disabled ? (
          <span key={d} className={cls} aria-disabled>
            {inner}
          </span>
        ) : (
          <Link key={d} href={hrefFor(d)} replace scroll={false} aria-current={on ? "date" : undefined} className={cls}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
