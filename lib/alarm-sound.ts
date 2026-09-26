"use client";

/**
 * Alarm tones synthesized with the Web Audio API — no audio files needed.
 * Returns a stop() function. Browsers may block audio until a user gesture;
 * `start` rejects in that case so the UI can show a "tap to play" button.
 */
type Tone = "beru" | "soft" | "classic";

const PATTERNS: Record<Tone, { notes: number[]; step: number; wave: OscillatorType; gap: number }> = {
  // C5 E5 G5 C6 — bouncy arpeggio
  beru: { notes: [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5], step: 0.14, wave: "triangle", gap: 0.6 },
  soft: { notes: [440, 554.37, 659.25], step: 0.35, wave: "sine", gap: 0.9 },
  classic: { notes: [880, 0, 880, 0, 880, 0, 880], step: 0.09, wave: "square", gap: 0.7 },
};

export async function startAlarmSound(tone: string = "beru", vibrate = true): Promise<() => void> {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  if (ctx.state === "suspended") await ctx.resume();
  if (ctx.state !== "running") {
    await ctx.close();
    throw new Error("autoplay-blocked");
  }

  const p = PATTERNS[(tone as Tone) in PATTERNS ? (tone as Tone) : "beru"];
  const master = ctx.createGain();
  master.gain.value = 0.25;
  master.connect(ctx.destination);

  let stopped = false;
  const loopLength = p.notes.length * p.step + p.gap;

  const schedule = (t0: number) => {
    p.notes.forEach((freq, i) => {
      if (!freq) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = p.wave;
      osc.frequency.value = freq;
      const s = t0 + i * p.step;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(1, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + p.step * 0.95);
      osc.connect(g).connect(master);
      osc.start(s);
      osc.stop(s + p.step);
    });
  };

  let next = ctx.currentTime + 0.05;
  const tick = () => {
    if (stopped) return;
    while (next < ctx.currentTime + 1.5) {
      schedule(next);
      next += loopLength;
    }
  };
  tick();
  const timer = window.setInterval(tick, 400);

  const vib = vibrate && "vibrate" in navigator ? window.setInterval(() => navigator.vibrate([400, 150, 400]), 1500) : null;
  if (vib !== null) navigator.vibrate([400, 150, 400]);

  return () => {
    stopped = true;
    window.clearInterval(timer);
    if (vib !== null) {
      window.clearInterval(vib);
      navigator.vibrate(0);
    }
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    window.setTimeout(() => ctx.close().catch(() => {}), 300);
  };
}

/** Short beeps for the workout timer countdown. Create it from a user gesture. */
export function createBeeper() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  void ctx.resume().catch(() => {});
  return {
    beep(freq = 880, seconds = 0.15, volume = 0.25) {
      if (ctx.state === "closed") return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const t0 = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + seconds + 0.02);
    },
    close() {
      void ctx.close().catch(() => {});
    },
  };
}
