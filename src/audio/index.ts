import { pitchOf, type Letter, type Mode } from "@/data/notes";
import { frequencyOfMidi, midiOf } from "./pitch";
import { playNote } from "./voice";

// One octave above middle C: phone speakers are far cleaner up here
const PREVIEW_OCTAVE = 5;

// Semitones above the root. The 3rd is what makes a chord sound bright (4) or dark (3),
// so every Dark orb sounds different, even C, D, F and G whose root is the same pitch.
const TRIADS: Record<Mode, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
};
const ROLL = 0.06; // seconds between chord notes, like a soft strum
const UPPER_LEVEL = 0.55; // 3rd and 5th sit under the root

let releaseCurrent: (() => void) | null = null;

function play(letter: Letter, mode: Mode, volume: number, length: number) {
  releaseCurrent?.(); // only one chord rings at a time
  const root = midiOf(pitchOf(letter, mode), PREVIEW_OCTAVE);
  const releases = TRIADS[mode].map((interval, i) =>
    playNote(frequencyOfMidi(root + interval), {
      volume: i === 0 ? volume : volume * UPPER_LEVEL,
      length,
      delay: i * ROLL,
    }),
  );
  releaseCurrent = () => releases.forEach((release) => release());
}

/** Soft preview as an orb lands in the centre of the carousel. */
export function previewNote(letter: Letter, mode: Mode) {
  play(letter, mode, 0.1, 1.4);
}

/** Fuller chord when an orb is chosen. */
export function chooseNote(letter: Letter, mode: Mode) {
  play(letter, mode, 0.18, 2.4);
}