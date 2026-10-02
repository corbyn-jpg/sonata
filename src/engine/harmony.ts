// Step 2: harmonic framing. Each day's note gets a chord that contains it, chosen by a Markov chain
// whose odds were learned from Bach's chorales (how often each chord follows each other chord).
import { CHORD_MODELS } from './model';
import { pickWeighted } from './random';
import { BORROW_FROM, chordTones, diatonicChord, pitchClass, withSeventh, type Chord, type WeekMode } from './theory';

/** Major-key odds for bright weeks, minor-key odds for dark ones. */
export const chordModelFor = (mode: WeekMode) =>
  CHORD_MODELS[mode === 'ionian' || mode === 'lydian' ? 'major' : 'minor'];

// A chord sounds most like "the day's note" when that note is its root
const ROLE_WEIGHTS = [1, 0.8, 0.6]; // root, 3rd, 5th

type Option = { chord: Chord; role: number };

/**
 * Every chord that contains `anchor` (a pitch class): the week's own chords if any fit, otherwise
 * chords borrowed from a neighbouring mode, with a 7th so the borrowing sounds intentional.
 */
export function chordOptions(anchor: number, mode: WeekMode): Option[] {
  const sources: [WeekMode, boolean][] = [[mode, false], ...BORROW_FROM[mode].map((m): [WeekMode, boolean] => [m, true])];
  for (const [source, borrowed] of sources) {
    const options: Option[] = [];
    for (let degree = 0; degree < 7; degree++) {
      const chord = diatonicChord(source, degree, borrowed);
      const role = chordTones(chord).indexOf(anchor);
      if (role >= 0) options.push({ chord: borrowed ? withSeventh(chord) : chord, role });
    }
    if (options.length > 0) return options;
  }
  throw new Error(`No chord contains pitch class ${anchor}`);
}

/** The chord for one day's note, following on from `previous`. Diminished chords are avoided. */
export function chooseChord(anchor: number, mode: WeekMode, previous: Chord | null, random: () => number): Chord {
  const options = chordOptions(anchor, mode);
  const { opening, transitions } = chordModelFor(mode);
  const odds = previous ? transitions[previous.degree] : opening;
  const weights = options.map(({ chord, role }) =>
    chord.quality === 'diminished' ? 0 : odds[chord.degree] * ROLE_WEIGHTS[role],
  );
  return pickWeighted(options, weights, random).chord;
}

const VOICING_LOW = 55; // G3: chords sit under the melody

/**
 * Step 3 (harmony): the chord's notes in close position, in whichever inversion moves least from
 * the previous chord, so each voice glides rather than jumps.
 */
export function voiceChord(chord: Chord, previous: readonly number[] | null): number[] {
  const tones = chordTones(chord);
  const inversions = tones.map((_, inversion) => {
    const order = [...tones.slice(inversion), ...tones.slice(0, inversion)];
    const notes: number[] = [];
    let n = VOICING_LOW;
    for (const tone of order) {
      while (pitchClass(n) !== tone) n++;
      notes.push(n);
      n++;
    }
    return notes;
  });
  if (!previous) return inversions[0];

  // Total distance each note has to travel to the nearest note of the previous chord
  const movement = (notes: number[]) =>
    notes.reduce((sum, n) => sum + Math.min(...previous.map((p) => Math.abs(n - p))), 0);
  return inversions.reduce((best, v) => (movement(v) < movement(best) ? v : best));
}

/** The chord's root as a bass note, between E2 and D♯3. */
export const bassNote = (chord: Chord) => 40 + ((chord.root - 4 + 12) % 12);