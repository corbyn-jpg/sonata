// Step 1: mode evaluation. Reads the week's balance of Bright and Dark days and picks the mode the whole song is written in.
import { valenceOf } from "@/data/notes";
import type { DayNote, WeekMode } from "./theory";

export const mean = (values: readonly number[]) =>
  values.reduce((sum, v) => sum + v, 0) / values.length;

export const valencesOf = (days: readonly DayNote[]) =>
  days.map((d) => valenceOf(d.note, d.mode));

/**
 Mostly Bright → a major mode: Lydian if the week was very bright (average valence 8+), else Ionian. Mostly Dark → a minor mode: Aeolian if the week was heavy (average below 3.5), else Dorian. An even split goes by average valence.
 */
export function evaluateMode(logged: readonly DayNote[]): WeekMode {
  const average = mean(valencesOf(logged));
  const brightShare =
    logged.filter((d) => d.mode === "major").length / logged.length;
  const bright = brightShare > 0.5 || (brightShare === 0.5 && average >= 5.5);
  if (bright) return average >= 8 ? "lydian" : "ionian";
  return average < 3.5 ? "aeolian" : "dorian";
}

/**
 * Step 4: a minor week that resolves towards the positive ends on a major chord (a Picardy third), a small reward at the end of a hard week. "Resolves" means the last check-in was Bright, or the second half of the week averages at least 2 points higher than the first.
 */
export function endsInPicardy(
  logged: readonly DayNote[],
  mode: WeekMode,
): boolean {
  if (mode !== "aeolian" && mode !== "dorian") return false;
  if (logged[logged.length - 1].mode === "major") return true;
  const half = Math.floor(logged.length / 2);
  if (half === 0) return false;
  const valences = valencesOf(logged);
  return mean(valences.slice(-half)) - mean(valences.slice(0, half)) >= 2;
}
