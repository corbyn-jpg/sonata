// Every song the user's check-ins make, to pick from on the Sheet music screen. Uses the same weeks
// and seeds as Weekly and Monthly (summariseMonth, the Monday's date, the 1st of the month), so a
// score is always the song as it sounds there.
import { mostUsedInstrument, type Instrument } from "@/audio/instruments";
import type { MonthWeekInput, Week } from "@/engine";
import { monthTitle, shortDate, startOfMonth, summariseMonth, type DatedNote } from "@/features/monthly/month";
import { dayKey, startOfWeek } from "@/lib/dates";

export type WeekSong = { kind: "week"; key: string; title: string; instrument: Instrument; week: Week; seed: string };
export type MonthSong = {
  kind: "month";
  key: string;
  title: string;
  instrument: Instrument;
  weeks: MonthWeekInput[];
  /** Each week's heading in the score, e.g. "Week of 5 Oct". */
  labels: string[];
  seed: string;
};
export type SongChoice = WeekSong | MonthSong;

/** Weeks with a check-in and months with a song, each newest first. A week belongs to the month it starts in. */
export function songChoices(checkins: readonly DatedNote[]): { weeks: WeekSong[]; months: MonthSong[] } {
  const months = new Map<string, Date>();
  for (const { timestamp } of checkins) {
    const month = startOfMonth(startOfWeek(timestamp));
    months.set(dayKey(month), month);
  }

  const weeks: WeekSong[] = [];
  const monthSongs: MonthSong[] = [];
  for (const month of [...months.values()].sort((a, b) => b.getTime() - a.getTime())) {
    const withSongs = summariseMonth(checkins, month).weeks.filter((w) => w.mode !== null);
    if (withSongs.length === 0) continue;
    monthSongs.push({
      kind: "month",
      key: `month-${dayKey(month)}`,
      title: monthTitle(month),
      instrument: mostUsedInstrument(withSongs.map((w) => w.instrument)) ?? "piano",
      weeks: withSongs.map((w) => ({ week: w.days, seed: dayKey(w.start) })),
      labels: withSongs.map((w) => `Week of ${shortDate(w.start)}`),
      seed: dayKey(month),
    });
    for (const w of [...withSongs].reverse())
      weeks.push({
        kind: "week",
        key: `week-${dayKey(w.start)}`,
        title: `Week of ${shortDate(w.start)} ${w.start.getFullYear()}`,
        instrument: w.instrument,
        week: w.days,
        seed: dayKey(w.start),
      });
  }
  return { weeks, months: monthSongs };
}
