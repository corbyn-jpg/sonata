import type { Pitch } from "@/data/notes";

const SEMITONES_FROM_C: Record<Pitch, number> = {
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

/** MIDI note number. Octave 4 is middle C's octave (C4 = 60). */
export function midiOf(pitch: Pitch, octave = 4): number {
  return 12 * (octave + 1) + SEMITONES_FROM_C[pitch];
}

/** Equal temperament, tuned to A4 = 440 Hz (MIDI 69). */
export function frequencyOfMidi(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function frequencyOf(pitch: Pitch, octave = 4): number {
  return frequencyOfMidi(midiOf(pitch, octave));
}
