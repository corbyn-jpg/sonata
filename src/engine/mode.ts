// Step 1: reads the week's balance of major and minor days and picks the mode the song is written in.
import { valenceOf } from "@/data/notes";
import type { DayNote, WeekMode } from "./theory";

export const mean = (values: readonly number[]) =>
  values.reduce((sum, v) => sum + v, 0) / values.length;

export const valencesOf = (days: readonly DayNote[]) =>
  days.map((d) => valenceOf(d.note, d.mode));

/**
 Mostly major → Lydian if very bright (average valence 8+), else Ionian. Mostly minor → Aeolian if heavy (average below 3.5), else Dorian. An even split goes by average valence.
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
 Step 4: a minor week that resolves upwards ends on a major chord (a Picardy third). It resolves if the last check-in was major, or the week's second half averages at least 2 points above the first.
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
