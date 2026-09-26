"use client";

import { useEffect, useRef, useState } from "react";
import { Beru } from "@/components/Beru";
import { useConfirm } from "@/components/feedback/FeedbackProvider";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/components/ui";
import { createBeeper } from "@/lib/alarm-sound";
import { exerciseMeta, exerciseName } from "@/lib/format";
import type { WorkoutItem } from "@/lib/types";
import { TutorialButton } from "./TutorialButton";

const COUNTDOWN_MS = 5_000;
const REST_SECONDS = 15;
const FINISH_VIBRATE_MS = 3_000;

type TimerItem = Pick<WorkoutItem, "name_id" | "name_en" | "sets" | "reps" | "duration_sec" | "minutes" | "category">;
interface Segment {
  kind: "work" | "rest";
  seconds: number;
  set: number;
  totalSets: number;
}

/** Timed sets ("3 × 30 detik") become work/rest intervals; anything else runs for its minutes. */
export function buildSegments(item: TimerItem): Segment[] {
  if (item.sets && item.duration_sec) {
    const out: Segment[] = [];
    for (let s = 1; s <= item.sets; s++) {
      out.push({ kind: "work", seconds: item.duration_sec, set: s, totalSets: item.sets });
      if (s < item.sets) out.push({ kind: "rest", seconds: REST_SECONDS, set: s, totalSets: item.sets });
    }
    return out;
  }
  return [{ kind: "work", seconds: Math.max(1, item.minutes) * 60, set: 1, totalSets: 1 }];
}

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Full-screen workout timer: 5 s get-ready countdown → timer (sets & rests) →
 * vibrates for 3 s (or until Done is pressed) and marks the workout done.
 */
export function WorkoutTimer({
  item,
  videoUrl,
  onClose,
  onDone,
}: {
  item: TimerItem;
  videoUrl?: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, locale } = useI18n();
  const confirm = useConfirm();
  const [segments] = useState(() => buildSegments(item));
  const [phase, setPhase] = useState<"countdown" | "running" | "finished">("countdown");
  const [segIndex, setSegIndex] = useState(0);
  const [remaining, setRemaining] = useState(COUNTDOWN_MS);
  const [paused, setPaused] = useState(false);

  const endAt = useRef(0);
  const pausedLeft = useRef(0);
  const lastSecond = useRef(0);
  const beeper = useRef<ReturnType<typeof createBeeper> | null>(null);

  // Mount: start the countdown clock, audio and keep the screen awake.
  useEffect(() => {
    endAt.current = Date.now() + COUNTDOWN_MS;
    try {
      beeper.current = createBeeper();
    } catch {
      beeper.current = null;
    }
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock
      ?.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => {
      beeper.current?.close();
      void lock?.release().catch(() => {});
      if ("vibrate" in navigator) navigator.vibrate(0);
    };
  }, []);

  // Tick
  useEffect(() => {
    if (phase === "finished" || paused) return;
    const id = window.setInterval(() => {
      const left = endAt.current - Date.now();
      setRemaining(left);
      const sec = Math.ceil(left / 1000);

      if (phase === "countdown" && sec > 0 && sec !== lastSecond.current) {
        lastSecond.current = sec;
        beeper.current?.beep(660, 0.12);
      }
      if (phase === "running" && sec > 0 && sec <= 3 && sec !== lastSecond.current) {
        lastSecond.current = sec;
        beeper.current?.beep(740, 0.08, 0.15);
      }
      if (left > 0) return;

      lastSecond.current = 0;
      if (phase === "countdown") {
        beeper.current?.beep(1320, 0.35);
        endAt.current = Date.now() + segments[0].seconds * 1000;
        setRemaining(segments[0].seconds * 1000);
        setSegIndex(0);
        setPhase("running");
        return;
      }
      const next = segIndex + 1;
      if (next < segments.length) {
        beeper.current?.beep(segments[next].kind === "rest" ? 520 : 1320, 0.3);
        if ("vibrate" in navigator) navigator.vibrate(200);
        endAt.current = Date.now() + segments[next].seconds * 1000;
        setRemaining(segments[next].seconds * 1000);
        setSegIndex(next);
        return;
      }
      // Finished: vibrate 3 s (stopped early by Done) + a little fanfare.
      setPhase("finished");
      setRemaining(0);
      if ("vibrate" in navigator) navigator.vibrate(FINISH_VIBRATE_MS);
      [880, 1109, 1319, 1760].forEach((f, i) => window.setTimeout(() => beeper.current?.beep(f, 0.22), i * 160));
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, paused, segIndex, segments]);

  const togglePause = () => {
    if (paused) {
      endAt.current = Date.now() + pausedLeft.current;
      setPaused(false);
    } else {
      pausedLeft.current = Math.max(0, endAt.current - Date.now());
      setPaused(true);
    }
  };

  const skip = () => {
    // Jump to the end of the current step; the tick loop advances from there.
    endAt.current = Date.now();
    if (paused) {
      pausedLeft.current = 0;
      setPaused(false);
    }
  };

  const stop = async () => {
    if (phase === "finished") return onClose();
    const wasPaused = paused;
    if (!wasPaused) togglePause();
    const ok = await confirm({ title: t("timer.stopConfirm"), confirmLabel: t("timer.stop"), danger: true, pose: "lift" });
    if (ok) onClose();
    else if (!wasPaused) {
      endAt.current = Date.now() + pausedLeft.current;
      setPaused(false);
    }
  };

  const seg = segments[segIndex];
  const name = exerciseName(item, locale);
  const isRest = phase === "running" && seg.kind === "rest";
  const total = phase === "countdown" ? COUNTDOWN_MS : seg.seconds * 1000;
  const progress = phase === "finished" ? 1 : 1 - Math.max(0, remaining) / total;
  const R = 118;
  const C = 2 * Math.PI * R;

  const label =
    phase === "countdown"
      ? t("timer.getReady")
      : phase === "finished"
        ? t("timer.finished")
        : isRest
          ? t("timer.rest")
          : t("timer.go");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      className={cn(
        "fixed inset-0 z-[60] flex flex-col items-center overflow-y-auto px-6 pt-[max(20px,env(safe-area-inset-top))] pb-[max(28px,env(safe-area-inset-bottom))] text-white transition-colors duration-500",
        phase === "finished" ? "bg-[#3CCB9A]" : isRest ? "bg-[#4DB5FF]" : "bg-[#6A5AE0]",
      )}
    >
      <div className="flex w-full max-w-md items-center gap-3">
        <button
          type="button"
          onClick={stop}
          aria-label={t("timer.stop")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15"
        >
          <Icon name="x" size={20} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-display text-xl font-semibold">{name}</span>
          <span className="text-xs font-bold opacity-85">{exerciseMeta(item, t)}</span>
        </div>
        {seg.totalSets > 1 && phase !== "finished" && (
          <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-extrabold">
            {t("timer.set", { a: seg.set, b: seg.totalSets })}
          </span>
        )}
      </div>

      <div className="relative mt-8 flex h-[280px] w-[280px] items-center justify-center">
        <svg viewBox="0 0 260 260" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
          <circle cx="130" cy="130" r={R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="14" />
          <circle
            cx="130"
            cy="130"
            r={R}
            fill="none"
            stroke="#fff"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(0.001, progress) * C} ${C}`}
          />
        </svg>
        <div className="flex flex-col items-center">
          {phase === "finished" ? (
            <Beru pose="cheer" size={180} className="animate-beru" />
          ) : (
            <>
              <span className="text-sm font-extrabold tracking-wide uppercase opacity-90">{label}</span>
              <span className="font-display text-[88px] leading-none font-bold tabular-nums">
                {phase === "countdown" ? Math.max(1, Math.ceil(remaining / 1000)) : clock(remaining)}
              </span>
              {paused && <span className="mt-1 rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold">{t("timer.paused")}</span>}
            </>
          )}
        </div>
      </div>

      {phase === "finished" ? (
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <h2 className="font-display text-[30px] font-semibold">{label}</h2>
          <p className="max-w-xs text-[15px] leading-relaxed opacity-95">{t("timer.finishedBody", { name })}</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-3">
          {phase === "running" && seg.kind === "work" && item.reps && (
            <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold">{exerciseMeta(item, t)}</span>
          )}
          {!isRest && phase === "running" && <Beru pose="lift" size={96} />}
          {isRest && <p className="text-center text-sm font-semibold opacity-95">{t("timer.nextSet", { n: seg.set + 1 })}</p>}
          {videoUrl && <TutorialButton url={videoUrl} title={name} className="bg-white/20 text-white" />}
        </div>
      )}

      <div className="mt-auto flex w-full max-w-md flex-col gap-2.5 pt-8">
        {phase === "finished" ? (
          <button
            type="button"
            autoFocus
            onClick={() => {
              if ("vibrate" in navigator) navigator.vibrate(0);
              onDone();
            }}
            className="flex h-[58px] items-center justify-center gap-2 rounded-[20px] bg-white font-display text-[19px] font-semibold text-[#11775A] transition focus-visible:outline-white active:scale-[0.98]"
          >
            <Icon name="check" size={22} strokeWidth={3} />
            {t("timer.done")}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={togglePause}
              className="flex h-[58px] items-center justify-center rounded-[20px] bg-white font-display text-[19px] font-semibold text-[#2B2335] transition active:scale-[0.98]"
            >
              {paused ? t("timer.resume") : t("timer.pause")}
            </button>
            <button
              type="button"
              onClick={skip}
              className="flex h-[58px] items-center justify-center rounded-[20px] border-2 border-white/75 font-display text-[19px] font-semibold transition active:scale-[0.98]"
            >
              {t("timer.skip")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
