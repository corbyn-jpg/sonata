/** Internal only */

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const; // scale order
export type Letter = (typeof LETTERS)[number];
export type Mode = "major" | "minor";
export type Pitch = Letter | "Eb" | "Ab" | "Bb";

export type Emotion =
  | "calm"
  | "content"
  | "joyful"
  | "grateful"
  | "curious"
  | "excited"
  | "proud"
  | "empty"
  | "lonely"
  | "bittersweet"
  | "disappointed"
  | "confused"
  | "anxious"
  | "angry";

type Entry = { emotion: Emotion; valence: number };

const NOTES: Record<Letter, Record<Mode, Entry>> = {
  C: {
    major: { emotion: "calm", valence: 7 },
    minor: { emotion: "empty", valence: 2 },
  },
  D: {
    major: { emotion: "content", valence: 7 },
    minor: { emotion: "lonely", valence: 3 },
  },
  E: {
    major: { emotion: "joyful", valence: 9 },
    minor: { emotion: "bittersweet", valence: 5 },
  },
  F: {
    major: { emotion: "grateful", valence: 8 },
    minor: { emotion: "disappointed", valence: 3 },
  },
  G: {
    major: { emotion: "curious", valence: 6 },
    minor: { emotion: "confused", valence: 4 },
  },
  A: {
    major: { emotion: "excited", valence: 9 },
    minor: { emotion: "anxious", valence: 2 },
  },
  B: {
    major: { emotion: "proud", valence: 8 },
    minor: { emotion: "angry", valence: 3 },
  },
};

// C natural minor lowers the 3rd, 6th and 7th
const FLAT_IN_MINOR: ReadonlySet<Letter> = new Set(["E", "A", "B"]);

export const pitchOf = (letter: Letter, mode: Mode): Pitch =>
  mode === "minor" && FLAT_IN_MINOR.has(letter)
    ? (`${letter}b` as Pitch)
    : letter;

export const emotionOf = (letter: Letter, mode: Mode) =>
  NOTES[letter][mode].emotion;
export const valenceOf = (letter: Letter, mode: Mode) =>
  NOTES[letter][mode].valence;

/** Screen-reader name*/
export const spokenName = (letter: Letter, mode: Mode) => {
  const pitch = pitchOf(letter, mode);
  return pitch.endsWith("b") ? `${pitch[0]} flat` : pitch;
};

/** Visible label for the grid view*/
export const displayName = (letter: Letter, mode: Mode) =>
  pitchOf(letter, mode).replace("b", "♭");
