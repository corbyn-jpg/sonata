// The monthly song: the month's weekly songs, unchanged and in order, joined by one-bar linking passages written by the same engine. Deterministic and offline, like composeWeek.
import {
  BEATS_PER_BAR,
  composeWeek,
  paletteOf,
  type Bar,
  type Composition,
  type NoteEvent,
} from "./compose";
import { bassNote, voiceChord } from "./harmony";
import { addPassingNotes, MelodyLine } from "./melody";
import { evaluateMode, mean, valencesOf } from "./mode";
import { hashString, seededRandom } from "./random";
import {
  chordTones,
  diatonicChord,
  SCALES,
  type Chord,
  type DayNote,
  type Week,
} from "./theory";

/** One week of the month: its check-ins and the seed its song was composed with (its Monday). */
export type MonthWeekInput = { week: Week; seed: string };

/** Where each part sits in the monthly song, in beats at the song's tempo. */
export type Section = { kind: "week" | "link"; start: number; beats: number };

export type MonthComposition = Composition & { sections: Section[] };

/**
 The dominant 7th that leads into `target`: the major chord a 5th above its root, with a minor 7th (A minor is approached from E7). It isn't in the week's mode, so it's marked as borrowed.
 */
export function dominantOf(target: Chord): Chord {
  const root = (target.root + 7) % 12;
  return {
    root,
    quality: "major",
    seventh: (root + 10) % 12,
    degree: 4,
    source: target.source,
    borrowed: true,
  };
}

const minorMode = (song: Composition) =>
  song.mode === "dorian" || song.mode === "aeolian";

/**
 One bar from the end of `from` into the start of `to`. Harmony: the next week's home chord (so itsmode is heard coming), then the dominant of the chord it opens on. Melody: the neural network walks from where the last week ended to a step away from where the next one begins.
 */
function link(
  from: Composition,
  to: Composition,
  random: () => number,
): { events: NoteEvent[]; chords: Chord[] } {
  const firstChord = to.bars[0].chords[0].chord;
  const chords = [diatonicChord(to.mode, 0), dominantOf(firstChord)];
  const lastNote = [...from.events]
    .reverse()
    .find((e) => e.part === "melody")!.midi;
  const firstNote =
    to.events.find((e) => e.part === "melody" && e.start === 0)?.midi ??
    lastNote;

  // The network hears the last week's final note first (it isn't played again), then writes the bar
  const line = new MelodyLine(minorMode(to), random);
  line.place(lastNote, -1, 1, chordTones(chords[0]), 0);
  addPassingNotes(
    line,
    firstNote,
    0,
    [2, 1, 1],
    SCALES[to.mode],
    chordTones(chords[1]),
  );

  const events: NoteEvent[] = line.notes
    .filter((n) => n.start >= 0)
    .map((n) => ({ part: "melody", ...n }));
  let voicing: number[] | null = null;
  chords.forEach((chord, i) => {
    voicing = voiceChord(chord, voicing);
    for (const midi of voicing)
      events.push({
        part: "chords",
        midi,
        start: i * 2,
        duration: 2,
        velocity: 0.4,
      });
    events.push({
      part: "bass",
      midi: bassNote(chord),
      start: i * 2,
      duration: 2,
      velocity: 0.5,
    });
  });
  return { events, chords };
}

/**
 Joins the month's weeks (only those with check-ins, oldest first) into one piece. Each week keeps its own pace: the song has one tempo, and each part's beats are stretched to match.
 */
export function composeMonth(
  weeks: readonly MonthWeekInput[],
  seed = "",
): MonthComposition {
  const withSongs = weeks.filter(({ week }) => week.some(Boolean));
  if (withSongs.length === 0)
    throw new Error("Nothing to compose: the month has no check-ins");

  const songs = withSongs.map(({ week, seed: weekSeed }) =>
    composeWeek(week, weekSeed),
  );
  const tempo = Math.round(mean(songs.map((s) => s.tempo)));
  const random = seededRandom(
    hashString(seed + JSON.stringify(withSongs.map((w) => w.week))),
  );

  const events: NoteEvent[] = [];
  const bars: Bar[] = [];
  const sections: Section[] = [];
  let offset = 0;
  // `stretch` turns a part's beats (at its own tempo) into beats at the song's tempo
  const add = (
    kind: Section["kind"],
    part: NoteEvent[],
    beats: number,
    stretch: number,
  ) => {
    for (const e of part)
      events.push({
        ...e,
        start: offset + e.start * stretch,
        duration: e.duration * stretch,
      });
    sections.push({ kind, start: offset, beats: beats * stretch });
    offset += beats * stretch;
  };

  songs.forEach((song, i) => {
    if (i > 0) {
      const joint = link(songs[i - 1], song, random);
      add(
        "link",
        joint.events,
        BEATS_PER_BAR,
        tempo / mean([songs[i - 1].tempo, song.tempo]),
      );
    }
    const stretch = tempo / song.tempo;
    for (const bar of song.bars) {
      bars.push({
        ...bar,
        chords: bar.chords.map((c) => ({
          ...c,
          start: offset + c.start * stretch,
          duration: c.duration * stretch,
        })),
      });
    }
    add("week", song.events, song.beats, stretch);
  });
  events.sort((a, b) => a.start - b.start);

  const days = withSongs.flatMap(({ week }) => week);
  const logged = days.filter((d): d is DayNote => d !== null);
  return {
    mode: evaluateMode(logged),
    tempo,
    averageValence: Math.round(mean(valencesOf(logged))),
    picardy: songs[songs.length - 1].picardy,
    bars,
    events,
    palette: paletteOf(days),
    beats: offset,
    sections,
  };
}
