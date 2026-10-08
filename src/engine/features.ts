// How a melody note is described to the neural network. Shared by the app and the training script so both encode notes identically. No imports: Node runs this exact file when training.

/** The network predicts the next interval: anything from an octave down to an octave up. */
export const MAX_INTERVAL = 12;
export const INTERVAL_COUNT = 2 * MAX_INTERVAL + 1;

/** Current pitch class + interval that led to it + chord under the next note + minor key + on the beat. */
export const INPUT_SIZE = 12 + INTERVAL_COUNT + 12 + 2;

/** Which output (0 … 24) means a move of `semitones`. */
export const intervalIndex = (semitones: number) =>
  Math.max(-MAX_INTERVAL, Math.min(MAX_INTERVAL, semitones)) + MAX_INTERVAL;

/**
 The input for one step, a list of 0s and 1s (one-hot):
 - the current note's pitch class, relative to the key's tonic (C)
 - the interval that led to it (none for the first note)
 - the pitch classes of the chord under the next note
 - whether the key is minor, and whether the next note lands on a beat
 */
export function encodeStep(
  pitchClass: number,
  intervalIn: number | null,
  chord: readonly number[],
  minor: boolean,
  onBeat: boolean,
): Float64Array {
  const x = new Float64Array(INPUT_SIZE);
  x[pitchClass] = 1;
  if (intervalIn !== null) x[12 + intervalIndex(intervalIn)] = 1;
  for (const pc of chord) x[12 + INTERVAL_COUNT + pc] = 1;
  x[INPUT_SIZE - 2] = minor ? 1 : 0;
  x[INPUT_SIZE - 1] = onBeat ? 1 : 0;
  return x;
}
