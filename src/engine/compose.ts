// The whole pipeline: a week of check-ins → a 7-bar song (one bar per day).
// Deterministic: the same week and seed always give the same song. Runs on the phone: no internet.
import { pitchOf, valenceOf } from "@/data/notes";
import { bassNote, chooseChord, voiceChord } from "./harmony";
import { addPassingNotes, MelodyLine, placeNote, rhythmFor } from "./melody";
import { endsInPicardy, evaluateMode, mean, valencesOf } from "./mode";
import { hashString, seededRandom } from "./random";
import {
  chordTones,
  diatonicChord,
  PITCH_CLASSES,
  pitchClass,
  SCALES,
  withSeventh,
  type Chord,
  type DayNote,
  type Week,
  type WeekMode,
} from "./theory";

export const BEATS_PER_BAR = 4;

export type NoteEvent = {
  part: "melody" | "chords" | "bass";
  midi: number;
  /** In beats from the start of the song. */
  start: number;
  duration: number;
  /** 0–1 */
  velocity: number;
};

export type Bar = {
  /** 0 = Monday … 6 = Sunday */
  day: number;
  /** The day's check-in, or null if it was missed (the melody rests and the harmony holds). */
  checkin: DayNote | null;
  chords: { chord: Chord; start: number; duration: number }[];
};

export type Composition = {
  mode: WeekMode;
  /** Beats per minute: calmer weeks are slower. */
  tempo: number;
  /** Whole number 1–10, for WEEKLY_MELODIES.average_valence. */
  averageValence: number;
  picardy: boolean;
  bars: Bar[];
  events: NoteEvent[];
  /** The two most common check-ins, for the disc artwork's two colours. */
  palette: [DayNote, DayNote];
  beats: number;
};

/** `seed` should identify the week (e.g. its Monday's date), so each week has its own variations. */
export function composeWeek(week: Week, seed = ""): Composition {
  if (week.length !== 7) throw new Error("A week has 7 days");
  const logged = week.filter((d): d is DayNote => d !== null);
  if (logged.length === 0)
    throw new Error("Nothing to compose: the week has no check-ins");

  const random = seededRandom(hashString(seed + JSON.stringify(week)));
  const mode = evaluateMode(logged);
  const picardy = endsInPicardy(logged, mode);
  const average = mean(valencesOf(logged));

  // The day's own pitch, in the octave nearest the day before
  const anchors: (number | null)[] = [];
  let near = 72; // C5, where the orbs play
  for (const day of week) {
    if (!day) {
      anchors.push(null);
      continue;
    }
    near = placeNote(PITCH_CLASSES[pitchOf(day.note, day.mode)], near);
    anchors.push(near);
  }
  const homeNote = placeNote(0, near);
  const home = picardy
    ? diatonicChord("ionian", 0, true)
    : diatonicChord(mode, 0);

  // A chord per day. A missed day holds the chord before it.
  let previous: Chord | null = null;
  const dayChords = anchors.map((anchor) => {
    const chord: Chord =
      anchor === null
        ? (previous ?? diatonicChord(mode, 0))
        : chooseChord(pitchClass(anchor), mode, previous, random);
    previous = chord;
    return chord;
  });

  const bars: Bar[] = week.map((checkin, day) => {
    const start = day * BEATS_PER_BAR;
    const chord = dayChords[day];
    if (day < 6)
      return {
        day,
        checkin,
        chords: [{ chord, start, duration: BEATS_PER_BAR }],
      };
    // Cadence: the last day's chord resolves to home (a dominant gets its 7th: G → G7 → C)
    if (chord.degree === 0 && !chord.borrowed && !picardy)
      return {
        day,
        checkin,
        chords: [{ chord: home, start, duration: BEATS_PER_BAR }],
      };
    const last =
      chord.degree === 4 && chord.seventh === null ? withSeventh(chord) : chord;
    return {
      day,
      checkin,
      chords: [
        { chord: last, start, duration: 2 },
        { chord: home, start: start + 2, duration: 2 },
      ],
    };
  });

  // Melody: each day's note on its bar's first beat; the neural network writes the notes between
  const line = new MelodyLine(mode === "dorian" || mode === "aeolian", random);
  const chordAt = (beat: number) => {
    const { chords } = bars[Math.min(6, Math.floor(beat / BEATS_PER_BAR))];
    const sounding = chords.filter((c) => c.start <= beat);
    return chordTones(sounding[sounding.length - 1].chord);
  };

  week.forEach((checkin, day) => {
    const start = day * BEATS_PER_BAR;
    const anchor = anchors[day];
    if (day === 6) {
      if (anchor !== null && pitchClass(anchor) !== 0) {
        line.place(anchor, start, 2, chordAt(start), 0.85);
        line.place(homeNote, start + 2, 2, chordAt(start + 2), 0.8);
      } else if (anchor !== null) {
        line.place(anchor, start, 4, chordAt(start), 0.85);
      } else {
        line.place(homeNote, start + 2, 2, chordAt(start + 2), 0.8);
      }
      return;
    }
    if (anchor === null || checkin === null) return;

    const rhythm = rhythmFor(valenceOf(checkin.note, checkin.mode));
    line.place(anchor, start, rhythm[0], chordAt(start), 0.85);
    const next =
      anchors.slice(day + 1).find((a): a is number => a !== null) ?? homeNote;
    const chord = dayChords[day];
    addPassingNotes(
      line,
      next,
      start + rhythm[0],
      rhythm.slice(1),
      SCALES[chord.source],
      chordTones(chord),
    );
  });

  const events: NoteEvent[] = line.notes.map((note) => ({
    part: "melody",
    ...note,
  }));

  // Accompaniment: smooth chord voicings plus the root in the bass
  let voicing: number[] | null = null;
  for (const bar of bars) {
    for (const { chord, start, duration } of bar.chords) {
      voicing = voiceChord(chord, voicing);
      for (const midi of voicing)
        events.push({ part: "chords", midi, start, duration, velocity: 0.45 });
      events.push({
        part: "bass",
        midi: bassNote(chord),
        start,
        duration,
        velocity: 0.55,
      });
    }
  }
  events.sort((a, b) => a.start - b.start);

  return {
    mode,
    tempo: Math.round(60 + 4 * average),
    averageValence: Math.round(average),
    picardy,
    bars,
    events,
    palette: paletteOf(week),
    beats: 7 * BEATS_PER_BAR,
  };
}

/** The two most common check-ins (ties go to the more recent). A week of one colour repeats it. */
export function paletteOf(week: Week): [DayNote, DayNote] {
  const counts = new Map<
    string,
    { day: DayNote; count: number; last: number }
  >();
  week.forEach((day, i) => {
    if (!day) return;
    const key = `${day.note}-${day.mode}`;
    const entry = counts.get(key) ?? { day, count: 0, last: i };
    counts.set(key, { day, count: entry.count + 1, last: i });
  });
  const ranked = [...counts.values()].sort(
    (a, b) => b.count - a.count || b.last - a.last,
  );
  return [ranked[0].day, (ranked[1] ?? ranked[0]).day];
}
