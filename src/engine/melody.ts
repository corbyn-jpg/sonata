// The day's notes are the melody's anchors; passing notes connect each one to the next, chosen step by step like a Markov chain (small steps and chord notes are likeliest).
import { pickWeighted } from './random';
import { chordTones, pitchClass, scaleDistance, stepFrom, type Chord } from './theory';

export const MELODY_LOW = 67; // G4
export const MELODY_HIGH = 86; // D6

/** `pc` in the octave nearest `near`, within the melody's range, so the line doesn't leap about. */
export function placeNote(pc: number, near: number): number {
  let best = -1;
  for (let n = MELODY_LOW; n <= MELODY_HIGH; n++)
    if (pitchClass(n) === pc && (best < 0 || Math.abs(n - near) < Math.abs(best - near))) best = n;
  return best;
}

/**
 How long each note in a bar lasts, in beats: the day's note first, then its passing notes. Brighter days move more; heavier days linger on their note.
 */
export function rhythmFor(valence: number): number[] {
  if (valence >= 8) return [2, 1, 0.5, 0.5];
  if (valence >= 5) return [2, 1, 1];
  return [3, 1];
}

/**
 `count` notes leading from `from` towards `to`. The last is always a scale step away from `to` (on the side it's coming from), so each day's note is arrived at smoothly.
 */
export function passingNotes(
  from: number,
  to: number,
  count: number,
  scale: readonly number[],
  chord: Chord,
  random: () => number,
): number[] {
  if (count === 0) return [];
  const direction = to >= from ? 1 : -1;
  const approach = stepFrom(to, direction === 1 ? -1 : 1, scale);
  const chordPcs = chordTones(chord);

  const notes: number[] = [];
  let current = from;
  for (let left = count; left > 1; left--) {
    const options: number[] = [];
    const weights: number[] = [];
    for (const step of [-2, -1, 1, 2]) {
      let n = current;
      for (let i = 0; i < Math.abs(step); i++) n = stepFrom(n, step > 0 ? 1 : -1, scale);
      if (n < MELODY_LOW - 2 || n > MELODY_HIGH + 2) continue;
      // Stay close enough to still reach the approach note by step
      if (scaleDistance(n, approach, scale) > 2 * (left - 1)) continue;
      options.push(n);
      weights.push(
        (Math.abs(step) === 1 ? 1 : 0.4) *
          (chordPcs.includes(pitchClass(n)) ? 1.5 : 1) *
          (Math.abs(n - approach) < Math.abs(current - approach) ? 1.5 : 1),
      );
    }
    if (options.length === 0) break;
    current = pickWeighted(options, weights, random);
    notes.push(current);
  }
  while (notes.length < count - 1) notes.push(current); // only if boxed in at the edge of the range
  notes.push(approach);
  return notes;
}