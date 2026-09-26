/**
 * Timezone-aware date helpers. Dates are handled as "YYYY-MM-DD" strings in
 * the user's timezone; timestamps are stored in UTC.
 */

const DAY_MS = 86_400_000;

function partsIn(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return out;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Local wall-clock parts of `date` in `timeZone`. weekday: 0 = Sunday. */
export function localParts(date: Date, timeZone: string) {
  const p = partsIn(date, timeZone);
  return {
    dateStr: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

export function todayIn(timeZone: string): string {
  return localParts(new Date(), timeZone).dateStr;
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function tzOffset(date: Date, timeZone: string): number {
  const p = partsIn(date, timeZone);
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** UTC instant for a local wall-clock time. */
export function zonedTimeToUtc(dateStr: string, time: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  const offset = tzOffset(new Date(guess), timeZone);
  return new Date(guess - offset);
}

/** [start, end) of a local day as ISO strings, for timestamptz range queries. */
export function dayRangeUtc(dateStr: string, timeZone: string): [string, string] {
  const start = zonedTimeToUtc(dateStr, "00:00", timeZone);
  return [start.toISOString(), new Date(start.getTime() + DAY_MS).toISOString()];
}

export function rangeUtc(fromDate: string, toDateExclusive: string, timeZone: string): [string, string] {
  return [
    zonedTimeToUtc(fromDate, "00:00", timeZone).toISOString(),
    zonedTimeToUtc(toDateExclusive, "00:00", timeZone).toISOString(),
  ];
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + n * DAY_MS);
  return t.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(ya, ma - 1, da) - Date.UTC(yb, mb - 1, db)) / DAY_MS);
}

/** 0 = Sunday */
export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Monday of the week containing dateStr. */
export function weekStart(dateStr: string): string {
  const wd = weekdayOf(dateStr);
  return addDays(dateStr, wd === 0 ? -6 : 1 - wd);
}

export function isValidDateStr(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

const intlLocale = (locale: string) => (locale === "en" ? "en-GB" : "id-ID");

/** "Sabtu, 26 September" */
export function formatLongDate(dateStr: string, locale: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatShortDate(dateStr: string, locale: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Short weekday label, e.g. "Sen" / "Mon". */
export function weekdayShort(dateStr: string, locale: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const s = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
  return s.replace(".", "").slice(0, 3);
}

/** Clock time of a timestamp in tz: "07.10" (id) or "07:10" (en). */
export function formatClock(iso: string, timeZone: string, locale: string): string {
  const { hour, minute } = localParts(new Date(iso), timeZone);
  const sep = locale === "en" ? ":" : ".";
  return `${String(hour).padStart(2, "0")}${sep}${String(minute).padStart(2, "0")}`;
}

/** "17:30:00" → "17:30" */
export function hhmm(time: string): string {
  return time.slice(0, 5);
}

export function minutesOfDay(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function localDateOf(iso: string, timeZone: string): string {
  return localParts(new Date(iso), timeZone).dateStr;
}
