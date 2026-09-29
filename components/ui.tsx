import Link from "next/link";
import { Beru } from "@/components/Beru";
import { Icon, type IconName } from "@/components/Icon";
import { initialOf } from "@/lib/format";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export type Accent = "mango" | "mint" | "grape" | "sky" | "berry" | "sun";

/** Solid accent tile (icon squares, avatars). */
export const SOLID: Record<Accent, string> = {
  mango: "bg-mango text-ink",
  mint: "bg-mint text-ink",
  grape: "bg-grape text-on-grape",
  sky: "bg-sky text-ink",
  berry: "bg-berry text-ink",
  sun: "bg-sun text-ink",
};

/** Icon tile colour per workout category. */
export const CATEGORY_TILE = { sport: SOLID.sky, cardio: SOLID.mango, strength: SOLID.grape, flexibility: SOLID.mint } as const;

/** Soft accent surface with deep text (chips, stat tiles). */
export const SOFT: Record<Accent, string> = {
  mango: "bg-mango-s text-mango-d",
  mint: "bg-mint-s text-mint-d",
  grape: "bg-grape-s text-grape-d",
  sky: "bg-sky-s text-sky-d",
  berry: "bg-berry-s text-berry-d",
  sun: "bg-sun-s text-sun-d",
};

export const ACCENTS: Accent[] = ["mango", "sky", "berry", "mint", "sun", "grape"];

/** Stable accent for a person, based on their id. */
export function accentFor(id: string): Accent {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

export function Avatar({
  name,
  src,
  id,
  size = 44,
  accent,
  className,
}: {
  name: string | null | undefined;
  src?: string | null;
  id?: string;
  size?: number;
  accent?: Accent;
  className?: string;
}) {
  const a = accent ?? (id ? accentFor(id) : "mango");
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={style}
      />
    );
  }
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-full font-display font-semibold", SOLID[a], className)}
      style={style}
      aria-hidden
    >
      {initialOf(name)}
    </span>
  );
}

export function Card({
  children,
  className,
  as: Tag = "section",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return <Tag className={cn("rounded-[28px] border border-line bg-card p-[18px]", className)}>{children}</Tag>;
}

export function Chip({
  children,
  accent,
  className,
}: {
  children: React.ReactNode;
  accent?: Accent;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-[5px] text-xs font-bold",
        accent ? SOFT[accent] : "bg-soft text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function IconButton({
  href,
  label,
  icon,
  dot,
  className,
}: {
  href: string;
  label: string;
  icon: IconName;
  dot?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-card text-text transition active:scale-95",
        className,
      )}
    >
      <Icon name={icon} size={20} strokeWidth={2} />
      {dot && <span className="absolute top-[9px] right-[10px] h-2 w-2 rounded-full bg-berry" />}
    </Link>
  );
}

/** Title row: small muted line above a Fredoka H1, optional actions on the right. */
export function PageTitle({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        {eyebrow && <span className="text-[13px] font-semibold text-muted">{eyebrow}</span>}
        <h1 className="font-display text-[30px] leading-tight font-semibold">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2.5">{actions}</div>}
    </div>
  );
}

/** Centered title with a back button (sub-pages). */
export function BackHeader({ href, backLabel, title, right }: { href: string; backLabel: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <IconButton href={href} label={backLabel} icon="back" />
      <h1 className="flex-1 truncate text-center font-display text-[22px] font-semibold">{title}</h1>
      {right ?? <span className="h-11 w-11" />}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-[19px] font-semibold">{children}</h2>
      {action}
    </div>
  );
}

/** Pill-style link group (segmented control using URL state). */
export function SegmentedLinks({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <div className="flex gap-1 rounded-[18px] bg-soft p-1">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          replace
          scroll={false}
          aria-current={it.active ? "page" : undefined}
          className={cn(
            "flex min-h-10 flex-1 items-center justify-center rounded-xl px-3.5 text-[13px] font-bold whitespace-nowrap transition",
            it.active ? "bg-card text-text shadow-sm" : "text-muted",
          )}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}

export function FilterChipLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex min-h-11 items-center rounded-full border-[1.5px] px-4 text-[13px] font-bold transition",
        active ? "border-grape bg-grape text-on-grape" : "border-line bg-card text-text",
      )}
    >
      {children}
    </Link>
  );
}

export function EmptyState({ pose = "wave", text, action }: { pose?: "wave" | "eat" | "lift" | "alarm" | "cheer"; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[26px] border-2 border-dashed border-line px-6 py-8 text-center">
      <Beru pose={pose} size={96} />
      <p className="max-w-[260px] text-sm font-semibold text-muted">{text}</p>
      {action}
    </div>
  );
}

export function ProgressBar({ value, max, className, barClass = "bg-grape" }: { value: number; max: number; className?: string; barClass?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full bg-soft", className)}>
      <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export const btn = {
  primary:
    "inline-flex h-14 items-center justify-center gap-2 rounded-[18px] bg-grape px-6 font-display text-lg font-semibold text-on-grape transition active:scale-[0.98] disabled:opacity-60",
  mango:
    "inline-flex h-14 items-center justify-center gap-2 rounded-[20px] bg-mango px-6 font-display text-[19px] font-semibold text-ink transition active:scale-[0.98] disabled:opacity-60",
  outline:
    "inline-flex h-14 items-center justify-center gap-2 rounded-[18px] border-2 border-line bg-card px-6 font-display text-lg font-semibold text-text transition active:scale-[0.98] disabled:opacity-60",
  small:
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[14px] bg-card px-4 text-[13px] font-bold text-text transition active:scale-95 disabled:opacity-60",
  ghost:
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[14px] px-3 text-[13px] font-bold text-grape-d transition active:scale-95 disabled:opacity-60",
};

export const input =
  "w-full rounded-[18px] border-[1.5px] border-line bg-card px-4 py-3 text-base text-text placeholder:text-muted/70 focus:border-grape focus:outline-none";

export const label = "text-sm font-bold";

/** Option button styled like the design's selectable cells. */
export function optionClass(active: boolean, accent: "mango" | "grape" | "mint" = "mango") {
  const on = {
    mango: "border-mango bg-mango text-ink",
    grape: "border-grape bg-grape text-on-grape",
    mint: "border-mint bg-mint-s text-mint-d",
  }[accent];
  return cn(
    "min-h-12 rounded-2xl border-[1.5px] px-3 text-sm font-bold transition active:scale-[0.98]",
    active ? on : "border-line bg-card text-text",
  );
}
