// Turns the JSB Chorales dataset (382 four-part Bach chorales) into training examples: every piece is moved into C major or C minor, then read as a chord progression and as a soprano melody.
import { readFileSync } from 'node:fs';
import { encodeStep, intervalIndex } from '../../src/engine/features.ts';

/** 16th-note steps, each [soprano, alto, tenor, bass] in MIDI (−1 = silent), transposed to C. */
export type Chorale = { minor: boolean; steps: number[][] };
export type Split = 'train' | 'valid' | 'test';

// Krumhansl–Kessler key profiles: how strongly each note of the scale suggests a key
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function correlation(a: readonly number[], b: readonly number[]) {
  const mean = (v: readonly number[]) => v.reduce((s, x) => s + x, 0) / v.length;
  const [ma, mb] = [mean(a), mean(b)];
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

/** The key whose profile best matches how long each pitch class sounds in the piece. */
export function findKey(steps: readonly number[][]): { tonic: number; minor: boolean } {
  const weights = new Array(12).fill(0);
  for (const step of steps) for (const midi of step) if (midi >= 0) weights[midi % 12]++;
  let best = { tonic: 0, minor: false, score: -Infinity };
  for (let tonic = 0; tonic < 12; tonic++) {
    const rotated = weights.map((_, i) => weights[(i + tonic) % 12]);
    for (const minor of [false, true]) {
      const score = correlation(rotated, minor ? MINOR_PROFILE : MAJOR_PROFILE);
      if (score > best.score) best = { tonic, minor, score };
    }
  }
  return best;
}

export function loadChorales(path: string): Record<Split, Chorale[]> {
  const data = JSON.parse(readFileSync(path, 'utf8')) as Record<Split, number[][][]>;
  const result = {} as Record<Split, Chorale[]>;
  for (const split of ['train', 'valid', 'test'] as const) {
    result[split] = data[split].map((steps) => {
      const { tonic, minor } = findKey(steps);
      const shift = -(tonic <= 6 ? tonic : tonic - 12); // the smaller move, so the register stays put
      return { minor, steps: steps.map((step) => step.map((midi) => (midi >= 0 ? midi + shift : -1))) };
    });
  }
  return result;
}

// --- Chords -------------------------------------------------------------------------------------

const TRIADS = [
  [0, 4, 7], // major
  [0, 3, 7], // minor
  [0, 3, 6], // diminished
];
// Chord root (semitones above C) → scale degree. Minor keys also use the raised 6th and 7th.
const MAJOR_DEGREES: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
const MINOR_DEGREES: Record<number, number> = { 0: 0, 2: 1, 3: 2, 5: 3, 7: 4, 8: 5, 9: 5, 10: 6, 11: 6 };

/** The root of the triad these notes spell (the bass breaks ties), or null if they don't spell one. */
export function chordRoot(notes: readonly number[]): number | null {
  const pcs = new Set(notes.filter((n) => n >= 0).map((n) => n % 12));
  const bass = notes[notes.length - 1] >= 0 ? notes[notes.length - 1] % 12 : -1;
  let best: number | null = null;
  let bestScore = 0;
  for (const root of pcs) {
    for (const triad of TRIADS) {
      const has = triad.map((i) => pcs.has((root + i) % 12));
      if (!has[0] || !has[1]) continue; // a chord needs its root and 3rd
      const score = 2 * has.filter(Boolean).length + (root === bass ? 1 : 0);
      if (score > bestScore) [best, bestScore] = [root, score];
    }
  }
  return best;
}

/** The chord on every beat, as scale degrees, with repeats merged: e.g. I IV V I. */
export function chordProgression(chorale: Chorale): number[] {
  const degrees = chorale.minor ? MINOR_DEGREES : MAJOR_DEGREES;
  const progression: number[] = [];
  for (let s = 0; s < chorale.steps.length; s += 4) {
    const root = chordRoot(chorale.steps[s]);
    const degree = root === null ? undefined : degrees[root];
    if (degree !== undefined && degree !== progression[progression.length - 1]) progression.push(degree);
  }
  return progression;
}

// --- Melody -------------------------------------------------------------------------------------

export type MelodyNote = { midi: number; start: number; chord: number[] };

/** The soprano line as notes (held 16ths merged), each with the pitch classes sounding under it. */
export function sopranoNotes(chorale: Chorale): MelodyNote[] {
  const notes: MelodyNote[] = [];
  chorale.steps.forEach((step, s) => {
    const midi = step[0];
    if (midi < 0 || midi === notes[notes.length - 1]?.midi) return;
    const chord = [...new Set(step.slice(1).filter((n) => n >= 0).map((n) => n % 12))];
    notes.push({ midi, start: s, chord });
  });
  return notes;
}

/** Inputs and targets for the network: read each note, predict the interval to the next. */
export function melodyExamples(chorale: Chorale) {
  const notes = sopranoNotes(chorale);
  const xs: Float64Array[] = [];
  const targets: number[] = [];
  for (let i = 0; i + 1 < notes.length; i++) {
    const [note, next] = [notes[i], notes[i + 1]];
    const intervalIn = i > 0 ? note.midi - notes[i - 1].midi : null;
    xs.push(encodeStep(note.midi % 12, intervalIn, next.chord, chorale.minor, next.start % 4 === 0));
    targets.push(intervalIndex(next.midi - note.midi));
  }
  return { xs, targets };
}