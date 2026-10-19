// Slow breathing at one beat a second: in for 4, out for 6, so six breaths a minute with the longer out-breath that makes it calming. Pure for testing, and a worklet so the orb can follow it on the UI thread.

// In seconds: breathing in, breathing out, and the session of six breaths (one minute)
export const INHALE = 4;
export const EXHALE = 6;
export const CYCLES = 6;
export const SESSION = CYCLES * (INHALE + EXHALE);

export type BreathPhase = "in" | "out" | "done";

export type Breath = {
  /** Which breath this is, 1 to CYCLES (CYCLES once finished). */
  cycle: number;
  phase: BreathPhase;
  /** How full the lungs are, 0 (out) to 1 (in), eased so the orb starts and stops gently. */
  fullness: number;
  /** How far through the whole session, 0 to 1, for the progress ring. */
  progress: number;
};

/** Where the session is `seconds` after it started. */
export function breathAt(seconds: number): Breath {
  "worklet";
  if (seconds >= SESSION)
    return { cycle: CYCLES, phase: "done", fullness: 0, progress: 1 };
  const t = Math.max(0, seconds);
  const length = INHALE + EXHALE;
  const index = Math.floor(t / length);
  const within = t - index * length;
  const ease = (p: number) => (1 - Math.cos(Math.PI * p)) / 2;
  const progress = t / SESSION;
  if (within < INHALE)
    return {
      cycle: index + 1,
      phase: "in",
      fullness: ease(within / INHALE),
      progress,
    };
  return {
    cycle: index + 1,
    phase: "out",
    fullness: 1 - ease((within - INHALE) / EXHALE),
    progress,
  };
}

/** One number per change of phase, so the screen can react to each change once (-1 when finished). */
export function stepOf(breath: Breath): number {
  "worklet";
  return breath.phase === "done"
    ? -1
    : breath.cycle * 2 + (breath.phase === "in" ? 0 : 1);
}
