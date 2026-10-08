// Turning the engine's notes into notation. Everything Sonata writes is in C (CLAUDE.md §7), so a
// score has no key signature: a note outside C major carries its own accidental, as on any lead
// sheet in C. Pure, so it's tested; drawn by svg.ts and exported by musicxml.ts.
import type { Chord } from "@/engine";

export const STEPS = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type Step = (typeof STEPS)[number];
export type Alter = -1 | 0 | 1;
export type Spelled = { step: Step; alter: Alter; octave: number };

// How each pitch class is written: flats for the notes the minor modes use (E♭, A♭, B♭), F♯ for Lydian
const SPELLING: readonly [Step, Alter][] = [
  ["C", 0], ["D", -1], ["D", 0], ["E", -1], ["E", 0], ["F", 0],
  ["F", 1], ["G", 0], ["A", -1], ["A", 0], ["B", -1], ["B", 0],
];

const pitchClass = (n: number) => ((n % 12) + 12) % 12;

/** How a pitch class (0 = C) is written, e.g. 3 → E♭. */
export const spellClass = (pc: number) => SPELLING[pitchClass(pc)];

/** MIDI 60 = C4. */
export function spell(midi: number): Spelled {
  const [step, alter] = spellClass(midi);
  return { step, alter, octave: Math.floor(midi / 12) - 1 };
}

/** Staff steps above the treble staff's bottom line (E4 = 0, B4 the middle line = 4, F5 the top = 8). */
export const staffStep = ({ step, octave }: Spelled) => STEPS.indexOf(step) + 7 * octave - (2 + 7 * 4);

const SIGN: Record<Alter, string> = { [-1]: "♭", 0: "", 1: "♯" };

/** e.g. "A♭", "Dm", "G7", "Bdim". */
export function chordName(chord: Chord): string {
  const [step, alter] = spellClass(chord.root);
  const root = `${step}${SIGN[alter]}`;
  const third = { major: "", minor: "m", diminished: "dim" }[chord.quality];
  if (chord.seventh === null) return root + third;
  const seventh = pitchClass(chord.seventh - chord.root);
  if (chord.quality === "major") return root + (seventh === 11 ? "maj7" : "7");
  if (chord.quality === "minor") return root + (seventh === 11 ? "m(maj7)" : "m7");
  return root + (seventh === 9 ? "dim7" : "m7♭5");
}

// ---- Bars -------------------------------------------------------------------------------------

export type NoteIn = { midi: number; start: number; duration: number };

export type NoteType = "whole" | "half" | "quarter" | "eighth" | "16th";
export type Accidental = "flat" | "sharp" | "natural";

export type Item = {
  /** Beats from the start of the bar, and how long it lasts. */
  start: number;
  length: number;
  type: NoteType;
  dotted: boolean;
} & (
  | { kind: "rest"; wholeBar: boolean }
  | {
      kind: "note";
      midi: number;
      pitch: Spelled;
      /** The accidental to print, if the note needs one in this bar. */
      accidental: Accidental | null;
      /** Tied on to the next item (a note too long to write as one shape). */
      tie: boolean;
      beam: "begin" | "end" | null;
    }
);

const SHAPES: readonly { length: number; type: NoteType; dotted: boolean }[] = [
  { length: 4, type: "whole", dotted: false },
  { length: 3, type: "half", dotted: true },
  { length: 2, type: "half", dotted: false },
  { length: 1.5, type: "quarter", dotted: true },
  { length: 1, type: "quarter", dotted: false },
  { length: 0.5, type: "eighth", dotted: false },
  { length: 0.25, type: "16th", dotted: false },
];

const EPS = 1e-6;
/** To the nearest 16th: month songs are un-stretched back to their own tempo, which leaves tiny errors. */
const snap = (beats: number) => Math.round(beats * 4) / 4;

/** Rests that fill a gap, each starting where a reader expects it (halves on beats 1 or 3, quarters on a beat). */
function rests(from: number, to: number): Item[] {
  const out: Item[] = [];
  let at = from;
  while (at < to - EPS) {
    const fits = SHAPES.find(({ length, dotted }) => {
      if (dotted || at + length > to + EPS) return false;
      if (length === 4) return at < EPS;
      if (length === 2) return at % 2 < EPS;
      if (length === 1) return at % 1 < EPS;
      return at % length < EPS;
    })!;
    out.push({ kind: "rest", start: at, length: fits.length, type: fits.type, dotted: false, wholeBar: fits.length === 4 });
    at += fits.length;
  }
  return out;
}

/** The note shapes that add up to `length` (tied if there's more than one). */
function shapes(length: number) {
  const out: (typeof SHAPES)[number][] = [];
  let left = length;
  while (left > EPS) {
    const shape = SHAPES.find((s) => s.length <= left + EPS)!;
    out.push(shape);
    left -= shape.length;
  }
  return out;
}

/**
 One 4/4 bar of melody as notes and rests: gaps become rests, each accidental is printed once per
 bar (and cancelled with a natural when the plain note returns), and two eighths in a beat are beamed.
 */
export function engraveBar(notes: readonly NoteIn[]): Item[] {
  const sorted = notes
    .map((n) => ({ midi: n.midi, start: snap(n.start), end: Math.min(4, snap(n.start + n.duration)) }))
    .filter((n) => n.start < 4 - EPS && n.end > n.start + EPS)
    .sort((a, b) => a.start - b.start);

  const items: Item[] = [];
  // What each written line or space currently means in this bar, e.g. "E5" → -1 after an E♭5
  const inForce = new Map<string, Alter>();
  let at = 0;
  sorted.forEach((note, i) => {
    const end = Math.min(note.end, sorted[i + 1]?.start ?? 4); // the melody is one line: no overlaps
    if (note.start > at + EPS) items.push(...rests(at, note.start));
    const pitch = spell(note.midi);
    const where = `${pitch.step}${pitch.octave}`;
    const current = inForce.get(where) ?? 0;
    const accidental: Accidental | null =
      pitch.alter === current ? null : pitch.alter === -1 ? "flat" : pitch.alter === 1 ? "sharp" : "natural";
    inForce.set(where, pitch.alter);

    let start = note.start;
    const parts = shapes(end - note.start);
    parts.forEach((shape, j) => {
      items.push({
        kind: "note",
        start,
        length: shape.length,
        type: shape.type,
        dotted: shape.dotted,
        midi: note.midi,
        pitch,
        accidental: j === 0 ? accidental : null,
        tie: j < parts.length - 1,
        beam: null,
      });
      start += shape.length;
    });
    at = end;
  });
  if (at < 4 - EPS) items.push(...rests(at, 4));

  // Beam a pair of eighth notes that share a beat
  for (let i = 0; i + 1 < items.length; i++) {
    const [a, b] = [items[i], items[i + 1]];
    if (
      a.kind === "note" && b.kind === "note" &&
      a.type === "eighth" && b.type === "eighth" && !a.dotted &&
      Math.floor(a.start + EPS) === Math.floor(b.start + EPS)
    ) {
      a.beam = "begin";
      b.beam = "end";
      i++;
    }
  }
  return items;
}
