/** Line icons used across the BearFit design (24×24 grid). */
const PATHS = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  food: "M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3c-2 1-3 3.5-3 7h3v11",
  workout: "M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12",
  progress: "M5 20v-6M11 20V8M17 20V11M3 20h18",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0",
  members: "M5.5 8a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .6 3 2.8 3 6",
  chat: "M4 5h16v11H9l-5 4z",
  program: "M8 3h8v4H8zM6 5H5v16h14V5h-1M9 12h6M9 16h4",
  profile: "M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 21c0-4 3.6-7 8-7s8 3 8 7",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  check: "M5 12l5 5 9-10",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM8.5 13a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M14 9.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0",
  back: "M15 6l-6 6 6 6",
  chevron: "M9 6l6 6-6 6",
  sound: "M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6",
  clock: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v5l3 2",
  send: "M4 12l16-8-6 16-3-7z",
  water: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z",
  stretch: "M12 3c4 3 6 6 6 10a6 6 0 0 1-12 0c0-4 2-7 6-10zM12 9v12",
  chart: "M5 20v-6M11 20V8M17 20V11M3 20h18",
  sun: "M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  ball: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M5.6 5.6a9 9 0 0 1 0 12.8M18.4 5.6a9 9 0 0 0 0 12.8",
  heartLine: "M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z",
  swap: "M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
  share: "M12 3v12M7 8l5-5 5 5M5 13v7h14v-7",
  copy: "M8 8h12v12H8zM4 16V4h12",
  search: "M4 11a7 7 0 1 0 14 0a7 7 0 1 0-14 0M20 20l-4-4",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  x: "M6 6l12 12M18 6L6 18",
  sparkle: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  globe: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  scale: "M5 4h14l-2 16H7zM9 9a3 3 0 0 1 6 0",
  target: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M7 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0",
  edit: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
} as const;

const FILLED = {
  heart: "M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z",
  flame: "M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 2 1 3 2 3 4 1-2 1-5 0-8z",
} as const;

export type IconName = keyof typeof PATHS | keyof typeof FILLED;

export function Icon({
  name,
  size = 20,
  strokeWidth = 2.2,
  className,
  label,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}) {
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
  if (name in FILLED) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...a11y}>
        <path d={FILLED[name as keyof typeof FILLED]} />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...a11y}
    >
      <path d={PATHS[name as keyof typeof PATHS]} />
    </svg>
  );
}

export const CATEGORY_ICON = { sport: "ball", cardio: "heartLine", strength: "workout", flexibility: "stretch" } as const;
export const REMINDER_ICON = {
  workout: "bell",
  water: "water",
  meal: "food",
  stretch: "stretch",
  recap: "chart",
  custom: "clock",
} as const;
