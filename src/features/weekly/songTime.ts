import { BEATS_PER_BAR } from "@/engine";
import { addDays } from "@/lib/dates";

// The song has one bar per day, so moving through it day by day is just bar arithmetic.

const LAST_BAR = 6;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** How long one bar (one day) lasts, in seconds. */
export const barSeconds = (tempo: number) => (BEATS_PER_BAR * 60) / tempo;

// The player works in whole milliseconds, so after jumping to a bar's start it can report a time a fraction of a millisecond before it. Anything this close to a bar line counts as the new bar.
const BAR_LINE_TOLERANCE = 0.05; // seconds

/** Which day's bar is playing at `seconds` (0 = Monday). */
export const barAt = (seconds: number, tempo: number) =>
  Math.min(LAST_BAR, Math.max(0, Math.floor((seconds + BAR_LINE_TOLERANCE) / barSeconds(tempo))));

export const barStart = (bar: number, tempo: number) => bar * barSeconds(tempo);

/**
 * Where "back" goes, like any music player: to the start of the current day, or to the day before
 * if we're already within a second of the start.
 */
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

/** What a shared or saved song is called: the week and the instrument, nothing about how the days felt. */
export function songFileName(weekStart: Date, instrument: string) {
  const date = `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
  return `Sonata - week of ${date} - ${instrument}.wav`;
}