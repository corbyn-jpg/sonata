import { LETTERS, type Letter, type Mode } from "@/data/notes";

// Pulse count = scale degree (C = 1 … B = 7). Longer counts are grouped so they're easy to count by feel: 5 = 3 + 2, 7 = 3 + 2 + 2.
const GROUPS: Record<number, number[]> = {
  1: [1],
  2: [2],
  3: [3],
  4: [2, 2],
  5: [3, 2],
  6: [3, 3],
  7: [3, 2, 2],
};

// Bright: light, quick pulses. Dark: heavier, slower ones. Times in ms.
export const FEEL: Record<Mode, { pulse: number; gap: number }> = {
  major: { pulse: 30, gap: 90 },
  minor: { pulse: 70, gap: 150 },
};
export const GROUP_GAP = 320;

/** One vibration: when it starts (ms from the beginning) and how long it lasts. */
export type Pulse = { at: number; duration: number };

/** Scale degree: C = 1 … B = 7. */
export const degreeOf = (letter: Letter) => LETTERS.indexOf(letter) + 1;

/** The rhythm that identifies a note by touch. */
export function pulsesFor(letter: Letter, mode: Mode): Pulse[] {
  const { pulse, gap } = FEEL[mode];
  const pulses: Pulse[] = [];
  let t = 0;
  for (const count of GROUPS[degreeOf(letter)]) {
    for (let i = 0; i < count; i++) {
      pulses.push({ at: t, duration: pulse });
      t += pulse + (i === count - 1 ? GROUP_GAP : gap);
    }
  }
  return pulses;
}

/** Android's `Vibration.vibrate` format: [wait, buzz, wait, buzz, …] in ms. */
export function toVibrationPattern(pulses: Pulse[]): number[] {
  const pattern: number[] = [];
  let cursor = 0;
  for (const { at, duration } of pulses) {
    pattern.push(at - cursor, duration);
    cursor = at + duration;
  }
  return pattern;
}