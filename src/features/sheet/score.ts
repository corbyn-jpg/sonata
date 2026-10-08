// A song as sheet music: the melody, bar by bar, with its chords named above. Built from exactly
// what the engine composes for Weekly and Monthly (same weeks, same seeds), so the score is the song.
import {
  BEATS_PER_BAR,
  composeMonth,
  composeWeek,
  linkChords,
  type Chord,
  type Composition,
  type MonthWeekInput,
  type NoteEvent,
} from "@/engine";
import type { NoteIn } from "./notation";

export type ScoreBar = {
  /** Melody notes, in beats from the start of the bar. */
  notes: NoteIn[];
  chords: { chord: Chord; start: number }[];
};

/** A run of bars at one tempo: a week, or the link bar between two weeks of a month. */
export type ScoreSection = {
  /** Shown above its first bar, e.g. "Week of 5 Oct"; null for a link bar. */
  label: string | null;
  tempo: number;
  bars: ScoreBar[];
};

export type Score = { title: string; subtitle: string; sections: ScoreSection[] };

const melody = (events: readonly NoteEvent[]) => events.filter((e) => e.part === "melody");

/** A week's seven bars, one per day. */
function weekBars(song: Composition): ScoreBar[] {
  const notes = melody(song.events);
  return song.bars.map((bar, i) => {
    const from = i * BEATS_PER_BAR;
    return {
      notes: notes
        .filter((n) => n.start >= from && n.start < from + BEATS_PER_BAR)
        .map((n) => ({ midi: n.midi, start: n.start - from, duration: n.duration })),
      chords: bar.chords.map(({ chord, start }) => ({ chord, start: start - from })),
    };
  });
}

export function weekScore(song: Composition, title: string, subtitle: string): Score {
  return { title, subtitle, sections: [{ label: null, tempo: song.tempo, bars: weekBars(song) }] };
}

/**
 A month's song as written: each week at its own tempo, with the link bar between weeks at the tempo
 between theirs. The monthly song is stored stretched to one tempo, so the link bars' melody is
 un-stretched back to beats here; the weeks are simply composed again (the same seed gives the same notes).
 */
export function monthScore(
  inputs: readonly MonthWeekInput[],
  seed: string,
  labels: readonly string[],
  title: string,
  subtitle: string,
): Score {
  const withSongs = inputs
    .map((input, i) => ({ ...input, label: labels[i] }))
    .filter(({ week }) => week.some(Boolean));
  const weeks = withSongs.map(({ week, seed: weekSeed }) => composeWeek(week, weekSeed));
  const month = composeMonth(withSongs, seed);
  const events = melody(month.events);

  const sections: ScoreSection[] = [];
  let week = 0;
  for (const part of month.sections) {
    if (part.kind === "week") {
      const song = weeks[week];
      sections.push({ label: withSongs[week].label, tempo: song.tempo, bars: weekBars(song) });
      week++;
      continue;
    }
    // A link bar, between weeks[week - 1] and weeks[week]
    const stretch = part.beats / BEATS_PER_BAR;
    const end = part.start + part.beats - 1e-6;
    const [from, to] = [weeks[week - 1], weeks[week]];
    const [home, dominant] = linkChords(to);
    sections.push({
      label: null,
      tempo: Math.round((from.tempo + to.tempo) / 2),
      bars: [
        {
          notes: events
            .filter((e) => e.start >= part.start - 1e-6 && e.start < end)
            .map((e) => ({ midi: e.midi, start: (e.start - part.start) / stretch, duration: e.duration / stretch })),
          chords: [
            { chord: home, start: 0 },
            { chord: dominant, start: 2 },
          ],
        },
      ],
    });
  }
  return { title, subtitle, sections };
}
