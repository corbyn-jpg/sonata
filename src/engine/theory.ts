// Music theory the engine is built on. Everything is in C; notes are MIDI numbers (C4 = 60) or pitch classes (semitones above C, 0–11).
import type { Letter, Mode, Pitch } from "@/data/notes";

/** One day's check-in, as the engine sees it. */
export type DayNote = { note: Letter; mode: Mode };
/** Monday first; null where there was no check-in. */
export type Week = readonly (DayNote | null)[];

/** The four modes a week can be written in (stored as WEEKLY_MELODIES.primary_mode). */
export type WeekMode = "ionian" | "lydian" | "dorian" | "aeolian";

export const MODE_NAMES: Record<WeekMode, string> = {
  ionian: "Ionian",
  lydian: "Lydian",
  dorian: "Dorian",
  aeolian: "Aeolian",
};

export const PITCH_CLASSES: Record<Pitch, number> = {
  C: 0,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

/** Each mode's scale on C. */
export const SCALES: Record<WeekMode, readonly number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11], // major
  lydian: [0, 2, 4, 6, 7, 9, 11], // major with a raised 4th: floating, ethereal
  dorian: [0, 2, 3, 5, 7, 9, 10], // minor with a raised 6th: thoughtful, not hopeless
  aeolian: [0, 2, 3, 5, 7, 8, 10], // natural minor, as on the Dark page
};

// Where to borrow a chord from when a day's note isn't in the week's mode (modal mixture).
// Every note the orbs can produce is in at least one of these.
export const BORROW_FROM: Record<WeekMode, readonly WeekMode[]> = {
  ionian: ["aeolian"],
  lydian: ["ionian", "aeolian"],
  dorian: ["ionian", "aeolian"],
  aeolian: ["ionian"],
};

export type Quality = "major" | "minor" | "diminished";

export type Chord = {
  root: number; // pitch class
  quality: Quality;
  /** Pitch class of an added 7th, or null for a plain triad. */
  seventh: number | null;
  /** 0 = I … 6 = vii, counted in `source`. */
  degree: number;
  /** The scale the chord is built from: the week's mode, or the one it was borrowed from. */
  source: WeekMode;
  borrowed: boolean;
};

export const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;

/** The triad on scale degree `degree` of `mode`, optionally with its 7th. */
export function diatonicChord(
  mode: WeekMode,
  degree: number,
  borrowed = false,
  withSeventh = false,
): Chord {
  const scale = SCALES[mode];
  const step = (n: number) => scale[(degree + n) % 7];
  const third = (step(2) - step(0) + 12) % 12;
  const fifth = (step(4) - step(0) + 12) % 12;
  const quality: Quality =
    fifth === 6 ? "diminished" : third === 4 ? "major" : "minor";
  return {
    root: step(0),
    quality,
    seventh: withSeventh ? step(6) : null,
    degree,
    source: mode,
    borrowed,
  };
}

/** The same chord with its 7th from its own scale (G → G7, Fm → Fm7). */
export const withSeventh = (chord: Chord): Chord =>
  diatonicChord(chord.source, chord.degree, chord.borrowed, true);

const THIRD: Record<Quality, number> = { major: 4, minor: 3, diminished: 3 };
const FIFTH: Record<Quality, number> = { major: 7, minor: 7, diminished: 6 };

/** Pitch classes in the chord: root, 3rd, 5th, then the 7th if there is one. */
export function chordTones(chord: Chord): number[] {
  const tones = [
    chord.root,
    (chord.root + THIRD[chord.quality]) % 12,
    (chord.root + FIFTH[chord.quality]) % 12,
  ];
  if (chord.seventh !== null) tones.push(chord.seventh);
  return tones;
}

/** The nearest note of `scale` strictly above (direction 1) or below (−1) `midi`. */
export function stepFrom(
  midi: number,
  direction: 1 | -1,
  scale: readonly number[],
): number {
  let n = midi + direction;
  while (!scale.includes(pitchClass(n))) n += direction;
  return n;
}

/** How many scale steps it takes to get from `from` to `to`. */
export function scaleDistance(
  from: number,
  to: number,
  scale: readonly number[],
): number {
  const direction = to > from ? 1 : -1;
  let steps = 0;
  for (let n = from; direction > 0 ? n < to : n > to; steps++)
    n = stepFrom(n, direction, scale);
  return steps;
}
