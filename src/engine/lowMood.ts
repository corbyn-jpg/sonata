// Low-mood detection (CLAUDE.md §7). Only decides whether to *offer* the grounding sheet on the Weekly tab. It never diagnoses, and nothing about it is stored.
import type { Week } from "./theory";

export const LOW_MOOD_RUN = 4;

/**
 True when 4 or more logged check-ins in a row were Dark, within the last 7 calendar days (pass them oldest first). A missed day is skipped: it neither breaks the run nor counts towards it.
 */
export function hasLowMoodRun(lastSevenDays: Week): boolean {
  let run = 0;
  for (const day of lastSevenDays.slice(-7)) {
    if (!day) continue;
    run = day.mode === "minor" ? run + 1 : 0;
    if (run >= LOW_MOOD_RUN) return true;
  }
  return false;
}

/** Each value averaged with up to `window − 1` values before it, for trend lines. */
export function movingAverage(values: readonly number[], window = 3): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((sum, v) => sum + v, 0) / slice.length;
  });
}
