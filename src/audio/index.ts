import { pitchOf, type Letter, type Mode } from "@/data/notes";
import { frequencyOf } from "./pitch";
import { playNote } from "./voice";

// One octave above middle C: phone speakers are far cleaner up here
const PREVIEW_OCTAVE = 5;

let releaseCurrent: (() => void) | null = null;

function play(letter: Letter, mode: Mode, volume: number, length: number) {
  releaseCurrent?.(); // only one preview rings at a time
  const frequency = frequencyOf(pitchOf(letter, mode), PREVIEW_OCTAVE);
  releaseCurrent = playNote(frequency, { volume, length });
}

/** Soft preview as an orb lands in the centre of the carousel. */
export function previewNote(letter: Letter, mode: Mode) {
  play(letter, mode, 0.12, 1.4);
}

/** Fuller note when an orb is chosen. */
export function chooseNote(letter: Letter, mode: Mode) {
  play(letter, mode, 0.22, 2.4);
}