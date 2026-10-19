import { BEATS_PER_BAR } from "@/engine";
import { addDays } from "@/lib/dates";

// The song has one bar per day, so moving through it day by day is just bar arithmetic.

const LAST_BAR = 6;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** How long one bar (one day) lasts, in seconds. */
export const barSeconds = (tempo: number) => (BEATS_PER_BAR * 60) / tempo;

// Seconds. The player works in whole milliseconds, so just after jumping to a bar it can report a time a hair before it; anything this close counts as the new bar.
const BAR_LINE_TOLERANCE = 0.05;

/** Which day's bar is playing at `seconds` (0 = Monday). */
export const barAt = (seconds: number, tempo: number) =>
  Math.min(
    LAST_BAR,
    Math.max(0, Math.floor((seconds + BAR_LINE_TOLERANCE) / barSeconds(tempo))),
  );

export const barStart = (bar: number, tempo: number) => bar * barSeconds(tempo);

/** Where "back" goes, as in any music player: the start of the current day, or the day before if within a second of its start. */
export function previousBarStart(seconds: number, tempo: number) {
  const bar = barAt(seconds, tempo);
  const start = barStart(bar, tempo);
  return seconds - start > 1 ? start : barStart(Math.max(0, bar - 1), tempo);
}

/** The start of the next day's bar, or null on Sunday. */
export function nextBarStart(seconds: number, tempo: number) {
  const bar = barAt(seconds, tempo);
  return bar < LAST_BAR ? barStart(bar + 1, tempo) : null;
}

/** 0:43 */
export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "29 Sep – 5 Oct" */
export function weekRange(weekStart: Date) {
  const end = addDays(weekStart, 6);
  const day = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return `${day(weekStart)} – ${day(end)}`;
}

export function songFileName(weekStart: Date, instrument: string) {
  return `Sonata - week of ${longDate(weekStart)} - ${instrument}.wav`;
}

/** e.g. "28 Sep 2026". */
export const longDate = (date: Date) =>
  `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
