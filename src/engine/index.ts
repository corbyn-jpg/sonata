// The on-device symbolic AI (CLAUDE.md §7): pure TypeScript, no network, no React.
export {
  composeWeek,
  BEATS_PER_BAR,
  type Bar,
  type Composition,
  type NoteEvent,
} from "./compose";
export { hasLowMoodRun, movingAverage, LOW_MOOD_RUN } from "./lowMood";
export {
  composeMonth,
  linkChords,
  type MonthComposition,
  type MonthWeekInput,
  type Section,
} from "./month";
export {
  MODE_NAMES,
  type Chord,
  type DayNote,
  type Week,
  type WeekMode,
} from "./theory";
