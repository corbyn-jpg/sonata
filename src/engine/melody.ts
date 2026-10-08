// Step 3: voice leading. The day's notes are the melody's anchors; the passing notes between them are chosen by the GRU neural network trained on Bach's melodies. Music rules decide which notes are allowed (in the scale, in range, able to reach the next day's note), and the network decides which of those is most musical given everything it has heard so far.
import { encodeStep, intervalIndex, MAX_INTERVAL } from "./features";
import { gruStep, predict } from "./gru";
import { MELODY_NETWORK } from "./model";
import { pickWeighted } from "./random";
import { pitchClass, scaleDistance, stepFrom } from "./theory";

export const MELODY_LOW = 67; // G4
export const MELODY_HIGH = 86; // D6

/** `pc` in the octave nearest `near`, within the melody's range, so the line doesn't leap about. */
export function placeNote(pc: number, near: number): number {
  let best = -1;
  for (let n = MELODY_LOW; n <= MELODY_HIGH; n++)
    if (
      pitchClass(n) === pc &&
      (best < 0 || Math.abs(n - near) < Math.abs(best - near))
    )
      best = n;
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

export type MelodyNote = {
  midi: number;
  start: number;
  duration: number;
  velocity: number;
};

/** The melody as it's written, with the network listening along (its memory is `state`). */
export class MelodyLine {
  readonly notes: MelodyNote[] = [];
  private state: Float64Array = new Float64Array(MELODY_NETWORK.hidden);
  private minor: boolean;
  private random: () => number;

  constructor(minor: boolean, random: () => number) {
    this.minor = minor;
    this.random = random;
  }

  get last(): number | undefined {
    return this.notes[this.notes.length - 1]?.midi;
  }

  /** Show the network the latest note and the chord to come; returns its odds for each interval. */
  private listen(start: number, chord: readonly number[]): Float64Array | null {
    const [before, last] = [
      this.notes[this.notes.length - 2],
      this.notes[this.notes.length - 1],
    ];
    if (!last) return null;
    const intervalIn = before ? last.midi - before.midi : null;
    const x = encodeStep(
      pitchClass(last.midi),
      intervalIn,
      chord,
      this.minor,
      Number.isInteger(start),
    );
    this.state = gruStep(MELODY_NETWORK, x, this.state);
    return predict(MELODY_NETWORK, this.state);
  }

  /** Add a note that's already decided (a day's note, the final C). */
  place(
    midi: number,
    start: number,
    duration: number,
    chord: readonly number[],
    velocity: number,
  ) {
    this.listen(start, chord);
    this.notes.push({ midi, start, duration, velocity });
  }

  /** Add whichever of `allowed` the network thinks is likeliest to come next (sampled, not always the top). */
  choose(
    allowed: readonly number[],
    start: number,
    duration: number,
    chord: readonly number[],
    velocity: number,
  ) {
    const odds = this.listen(start, chord);
    const last = this.last;
    const weights = allowed.map((n) =>
      odds && last !== undefined && Math.abs(n - last) <= MAX_INTERVAL
        ? odds[intervalIndex(n - last)]
        : 1,
    );
    const midi = pickWeighted(allowed, weights, this.random);
    this.notes.push({ midi, start, duration, velocity });
    return midi;
  }
}

/**
 * Passing notes from the line's last note towards `to`, one per duration. The last always lands a
 * scale step from `to` (on the side it's coming from), so each day's note is arrived at smoothly.
 */
export function addPassingNotes(
  line: MelodyLine,
  to: number,
  start: number,
  durations: readonly number[],
  scale: readonly number[],
  chord: readonly number[],
) {
  const from = line.last;
  if (from === undefined || durations.length === 0) return;
  const approach = stepFrom(to, to >= from ? -1 : 1, scale);

  let current = from;
  let t = start;
  durations.forEach((duration, i) => {
    const left = durations.length - i;
    if (left === 1) {
      line.place(approach, t, duration, chord, 0.65);
    } else {
      // Allowed: up to two scale steps away, in range, and still able to reach the approach note
      const allowed: number[] = [];
      for (const step of [-2, -1, 1, 2]) {
        let n = current;
        for (let k = 0; k < Math.abs(step); k++)
          n = stepFrom(n, step > 0 ? 1 : -1, scale);
        if (n < MELODY_LOW - 2 || n > MELODY_HIGH + 2) continue;
        if (scaleDistance(n, approach, scale) > 2 * (left - 1)) continue;
        allowed.push(n);
      }
      current = line.choose(
        allowed.length > 0 ? allowed : [current],
        t,
        duration,
        chord,
        0.65,
      );
    }
    t += duration;
  });
}
