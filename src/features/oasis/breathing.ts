// Breathing space: slow breathing counted at 60 BPM (one beat a second), in for 4 and out for 6. A longer out-breath than in-breath is what makes it calming, and six breaths a minute is the slow, steady pace this kind of exercise aims for. Pure, so it's tested, and a worklet, so the orb can follow it on the UI thread.

export const INHALE = 4; // beats (seconds) breathing in
export const EXHALE = 6; // beats breathing out
export const CYCLES = 6; // breaths in a session: one minute
export const SESSION = CYCLES * (INHALE + EXHALE); // seconds

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
  if (seconds >= SESSION) return { cycle: CYCLES, phase: "done", fullness: 0, progress: 1 };
  const t = Math.max(0, seconds);
  const length = INHALE + EXHALE;
  const index = Math.floor(t / length);
  const within = t - index * length;
  const ease = (p: number) => (1 - Math.cos(Math.PI * p)) / 2;
  const progress = t / SESSION;
  if (within < INHALE) return { cycle: index + 1, phase: "in", fullness: ease(within / INHALE), progress };
  return { cycle: index + 1, phase: "out", fullness: 1 - ease((within - INHALE) / EXHALE), progress };
}

/** One number per change of phase, so the screen can react to each change once (-1 when finished). */
export function stepOf(breath: Breath): number {
  "worklet";
  return breath.phase === "done" ? -1 : breath.cycle * 2 + (breath.phase === "in" ? 0 : 1);
}