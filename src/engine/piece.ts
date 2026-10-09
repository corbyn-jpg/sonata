// The Composer: the user writes a tune on a grid, one note per beat, and the engine can harmonise it with the
// same chord odds it learned from Bach for the weekly songs. Deterministic: the same tune always gets the same chords.
import { pitchOf, type Letter, type Mode } from "@/data/notes";
import { BEATS_PER_BAR, type NoteEvent } from "./compose";
import { bassNote, chordModelFor, chordOptions, voiceChord } from "./harmony";
import { hashString, pickWeighted, seededRandom } from "./random";
import {
  chordTones,
  diatonicChord,
  PITCH_CLASSES,
  type Chord,
  type WeekMode,
} from "./theory";

export const PIECE_STEPS = 16; // four bars of four beats
export const MIN_TEMPO = 60;
export const MAX_TEMPO = 160;

export type Piece = {
  mode: Mode;
  /** One per beat: the note on that step, or null for a rest. */
  steps: readonly (Letter | null)[];
  /** Beats per minute. */
  tempo: number;
  /** Whether the engine adds chords and a bass line under the tune. */
  harmony: boolean;
};

export type PieceSong = {
  tempo: number;
  /** Up to the end of the last bar with a note in it. */
  beats: number;
  events: NoteEvent[];
  /** One per bar; empty without harmony. */
  chords: Chord[];
};

const MELODY_C = 72; // C5, where the orbs play: each grid row is one fixed pitch

/** The MIDI note a grid row plays (minor lowers E, A and B, as on Home). */
export const pieceMidi = (letter: Letter, mode: Mode) =>
  MELODY_C + PITCH_CLASSES[pitchOf(letter, mode)];

export const isEmptyPiece = (piece: Pick<Piece, "steps">) =>
  piece.steps.every((step) => step === null);

/**
 The chord for one bar: the learned odds of following `previous`, times how many of the bar's notes the chord
 contains (squared), so it fits the whole bar rather than only its first note. Diminished chords are avoided.
 */
export function chooseBarChord(
  notes: readonly number[],
  mode: WeekMode,
  previous: Chord | null,
  random: () => number,
): Chord {
  const options = chordOptions(notes[0], mode); // every chord containing the bar's first note
  const { opening, transitions } = chordModelFor(mode);
  const odds = previous ? transitions[previous.degree] : opening;
  const weights = options.map(({ chord }) => {
    if (chord.quality === "diminished") return 0;
    const tones = chordTones(chord);
    const fit = notes.filter((note) => tones.includes(note)).length;
    return odds[chord.degree] * fit * fit;
  });
  return pickWeighted(options, weights, random).chord;
}

/** The piece as notes to play: the tune, and, if asked for, a chord and bass note per bar. */
export function composePiece(piece: Piece): PieceSong {
  const last = piece.steps.findLastIndex((step) => step !== null);
  const bars = Math.ceil((last + 1) / BEATS_PER_BAR);

  const events: NoteEvent[] = [];
  piece.steps.forEach((letter, step) => {
    if (letter)
      events.push({
        part: "melody",
        midi: pieceMidi(letter, piece.mode),
        start: step,
        duration: 1,
        velocity: step % BEATS_PER_BAR === 0 ? 0.9 : 0.8, // a little weight on each bar's first beat
      });
  });

  const chords: Chord[] = [];
  if (piece.harmony && bars > 0) {
    const mode: WeekMode = piece.mode === "major" ? "ionian" : "aeolian";
    // Seeded by the tune alone, so changing the tempo keeps the same chords
    const random = seededRandom(
      hashString(JSON.stringify([piece.mode, piece.steps])),
    );
    let previous: Chord | null = null;
    let voicing: number[] | null = null;
    for (let bar = 0; bar < bars; bar++) {
      const start = bar * BEATS_PER_BAR;
      const notes = piece.steps
        .slice(start, start + BEATS_PER_BAR)
        .filter((letter): letter is Letter => letter !== null)
        .map((letter) => PITCH_CLASSES[pitchOf(letter, piece.mode)]);
      // A bar of rests holds the chord before it
      const chord: Chord =
        notes.length > 0
          ? chooseBarChord(notes, mode, previous, random)
          : (previous ?? diatonicChord(mode, 0));
      previous = chord;
      chords.push(chord);

      voicing = voiceChord(chord, voicing);
      for (const midi of voicing)
        events.push({
          part: "chords",
          midi,
          start,
          duration: BEATS_PER_BAR,
          velocity: 0.45,
        });
      events.push({
        part: "bass",
        midi: bassNote(chord),
        start,
        duration: BEATS_PER_BAR,
        velocity: 0.55,
      });
    }
    events.sort((a, b) => a.start - b.start);
  }

  return {
    tempo: piece.tempo,
    beats: bars * BEATS_PER_BAR,
    events,
    chords,
  };
}
