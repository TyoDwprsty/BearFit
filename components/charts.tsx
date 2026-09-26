import { cn } from "@/components/ui";

/** Vertical bars with value on top and label below (design: Menit latihan). */
export function BarChart({
  bars,
  height = 96,
  highlightClass = "bg-mango",
  barClass = "bg-grape",
  targetLine,
}: {
  bars: { label: string; value: number; highlight?: boolean }[];
  height?: number;
  highlightClass?: string;
  barClass?: string;
  targetLine?: number;
}) {
  const max = Math.max(1, targetLine ?? 0, ...bars.map((b) => b.value));
  return (
    <div className="relative">
      {targetLine ? (
        <div
          className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-line"
          style={{ bottom: 22 + (targetLine / max) * height }}
          aria-hidden
        />
      ) : null}
      <div className="grid items-end gap-2.5" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
        {bars.map((b, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted">{b.value ? Math.round(b.value) : "–"}</span>
            <div
              className={cn("w-full max-w-[34px] rounded-[10px]", b.highlight ? highlightClass : b.value ? barClass : "bg-soft")}
              style={{ height: Math.max(6, Math.round((b.value / max) * height)) }}
            />
            <span className="text-[11px] font-bold text-muted">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Weight trend line (design: Berat badan). */
export function LineChart({ values, label }: { values: number[]; label: string }) {
  const W = 310;
  const H = 96;
  const pad = 10;
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (values.length - 1);
    const y = 12 + ((max - v) / span) * (H - 32);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `M${pts[0][0]} ${pts[0][1]} ${pts
    .slice(1)
    .map(([x, y]) => `L${x} ${y}`)
    .join(" ")} L${pts[pts.length - 1][0]} ${H - 16} L${pts[0][0]} ${H - 16} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
      <line x1={pad} y1={H - 16} x2={W - pad} y2={H - 16} stroke="var(--line)" strokeWidth="1" />
      <path d={area} fill="var(--mint-s)" />
      <polyline points={line} fill="none" stroke="var(--mint)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) =>
        i === pts.length - 1 ? (
          <circle key={i} cx={x} cy={y} r="6" fill="var(--mint)" />
        ) : (
          <circle key={i} cx={x} cy={y} r="4.5" fill="var(--card)" stroke="var(--mint)" strokeWidth="3" />
        ),
      )}
    </svg>
  );
}
