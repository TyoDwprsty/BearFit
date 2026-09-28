import { Beru, type BeruPose } from "@/components/Beru";
import { cn } from "@/components/ui";

type Tone = "error" | "success" | "info";

const TONE: Record<Tone, { box: string; bubble: string; pose: BeruPose }> = {
  error: { box: "border-berry/40 bg-berry-s text-berry-d", bubble: "bg-berry/20", pose: "alarm" },
  success: { box: "border-mint/40 bg-mint-s text-mint-d", bubble: "bg-mint/25", pose: "cheer" },
  info: { box: "border-grape/30 bg-grape-s text-grape-d", bubble: "bg-grape/20", pose: "wave" },
};

/** Inline message with Beru reacting to it (replaces plain error boxes). */
export function Alert({
  tone = "error",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const s = TONE[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("animate-rise flex items-center gap-3 rounded-[22px] border-[1.5px] py-2.5 pr-4 pl-2.5", s.box, className)}
    >
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", s.bubble)}>
        <Beru pose={s.pose} size={44} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5 text-sm leading-snug font-semibold">
        {title && <strong className="font-display text-base">{title}</strong>}
        <span>{children}</span>
      </div>
    </div>
  );
}
