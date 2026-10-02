import type { Letter, Mode } from "@/data/notes";
import type { WeekDay } from "./useWeekSong";

// Example weeks for trying the Weekly screen in development builds, one for each mode the AI can
// pick, so every record design can be seen without waiting a week. Missed days included.

const day = (note: Letter, mode: Mode): WeekDay => ({ note, mode, instrument: "piano" });

export const DEMO_WEEKS = {
  Ionian: [day("C", "major"), day("D", "major"), day("G", "major"), null, day("C", "major"), day("F", "minor"), day("D", "major")],
  Lydian: [day("E", "major"), day("A", "major"), day("B", "major"), day("E", "major"), null, day("F", "major"), day("A", "major")],
  Dorian: [day("E", "minor"), day("G", "minor"), day("A", "major"), day("B", "minor"), day("E", "minor"), null, day("G", "major")],
  Aeolian: [day("C", "minor"), day("E", "minor"), day("G", "minor"), day("B", "minor"), day("C", "minor"), day("A", "minor"), day("G", "minor")],
} satisfies Record<string, WeekDay[]>;

export type DemoWeek = keyof typeof DEMO_WEEKS;
export const DEMO_NAMES = Object.keys(DEMO_WEEKS) as DemoWeek[];