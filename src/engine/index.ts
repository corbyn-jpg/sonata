// The on-device symbolic AI (CLAUDE.md §7): pure TypeScript, no network, no React.
export { composeWeek, BEATS_PER_BAR, type Bar, type Composition, type NoteEvent } from './compose';
export { hasLowMoodRun, movingAverage, LOW_MOOD_RUN } from './lowMood';
export { MODE_NAMES, type DayNote, type Week, type WeekMode } from './theory';