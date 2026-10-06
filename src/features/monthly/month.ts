import { evaluateMode, mean, valencesOf } from "@/engine/mode";
import type { DayNote, Week, WeekMode } from "@/engine/theory";
import { addDays, dayKey } from "@/lib/dates";
import { mostUsedInstrument, type Instrument } from "@/audio/instruments";

// A month at a glance. Pure, so it's easy to test: the screen loads the check-ins and passes them in.

export const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

/** The first day of the month `n` months after `month` (negative goes back). */
export const addMonths = (month: Date, n: number) =>
  new Date(month.getFullYear(), month.getMonth() + n, 1);

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** e.g. "October". */
export const monthName = (month: Date) => MONTHS[month.getMonth()];

/** e.g. "5 Oct". */
export const shortDate = (date: Date) =>
  `${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}`;

/** e.g. "October 2026". */
export const monthTitle = (month: Date) =>
  `${MONTHS[month.getMonth()]} ${month.getFullYear()}`;

/** The month's days as calendar rows, Monday first. Null pads the first and last rows. */
export function monthGrid(month: Date): (Date | null)[][] {
  const first = startOfMonth(month);
  const length = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();
  const lead = (first.getDay() + 6) % 7; // getDay(): Sunday = 0
  const cells: (Date | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length }, (_, i) => addDays(first, i)),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, row) =>
    cells.slice(row * 7, row * 7 + 7),
  );
}

/** Every day of the month in order: its check-in, or null if there wasn't one. */
export function daysOfMonth(days: ReadonlyMap<string, DayNote>, month: Date): (DayNote | null)[] {
  const first = startOfMonth(month);
  const length = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return Array.from({ length }, (_, i) => days.get(dayKey(addDays(first, i))) ?? null);
}

/** The Mondays of the weeks that start in this month. Each of those weeks' songs belongs to this month. */
export function weeksOfMonth(month: Date): Date[] {
  const first = startOfMonth(month);
  const toMonday = (8 - first.getDay()) % 7; // 0 when the 1st is a Monday
  const weeks: Date[] = [];
  for (
    let monday = addDays(first, toMonday);
    monday.getMonth() === first.getMonth();
    monday = addDays(monday, 7)
  ) {
    weeks.push(monday);
  }
  return weeks;
}

/** A check-in as the month needs it: the orb chosen, its instrument, and when. */
export type DatedNote = DayNote & { instrument?: Instrument; timestamp: Date };

export type MonthWeek = {
  /** The week's Monday. */
  start: Date;
  /** Monday to Sunday (notes only, as the song is composed from them); null where there was no check-in. */
  days: Week;
  /** What its song plays on: the instrument used most that week. */
  instrument: Instrument;
  /** The mode its song is written in, or null if the week has no check-ins (so no song). */
  mode: WeekMode | null;
  /** Mean valence of the week's check-ins (1–10), or null. */
  averageValence: number | null;
};

export type MonthSummary = {
  /** Each day's check-in by day key (the latest, if a day has two). */
  days: Map<string, DayNote>;
  /** Days in this month with a check-in. */
  loggedDays: number;
  weeks: MonthWeek[];
  /** Weeks with at least one check-in: each has a song. */
  melodies: number;
  /** The mode most of the month's songs were written in; a tie goes to the latest week. */
  mostUsedMode: { mode: WeekMode; weeks: number } | null;
};

export function summariseMonth(
  checkins: readonly DatedNote[],
  month: Date,
): MonthSummary {
  const days = new Map<string, DayNote>();
  const instruments = new Map<string, Instrument | undefined>();
  const sorted = [...checkins].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  for (const { note, mode, instrument, timestamp } of sorted) {
    days.set(dayKey(timestamp), { note, mode });
    instruments.set(dayKey(timestamp), instrument);
  }

  const first = startOfMonth(month);
  const loggedDays = [...days.keys()].filter((key) =>
    key.startsWith(dayKey(first).slice(0, 8)),
  ).length;

  const weeks = weeksOfMonth(month).map((start): MonthWeek => {
    const keys = Array.from({ length: 7 }, (_, i) => dayKey(addDays(start, i)));
    const week = keys.map((key) => days.get(key) ?? null);
    const logged = week.filter((d): d is DayNote => d !== null);
    return {
      start,
      days: week,
      instrument:
        mostUsedInstrument(keys.map((key) => instruments.get(key))) ?? "piano",
      mode: logged.length ? evaluateMode(logged) : null,
      averageValence: logged.length ? mean(valencesOf(logged)) : null,
    };
  });

  // Count each mode's weeks; walking oldest first with >= lets the latest week win a tie
  const counts = new Map<WeekMode, number>();
  let mostUsedMode: MonthSummary["mostUsedMode"] = null;
  for (const { mode } of weeks) {
    if (!mode) continue;
    const n = (counts.get(mode) ?? 0) + 1;
    counts.set(mode, n);
    if (!mostUsedMode || n >= mostUsedMode.weeks)
      mostUsedMode = { mode, weeks: n };
  }

  return {
    days,
    loggedDays,
    weeks,
    melodies: weeks.filter((w) => w.mode).length,
    mostUsedMode,
  };
}
