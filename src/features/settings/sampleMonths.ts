import { INSTRUMENTS, type Instrument } from "@/audio/instruments";
import { LETTERS, valenceOf, type Letter, type Mode } from "@/data/notes";
import { hashString, pickWeighted, seededRandom } from "@/engine/random";
import { addMonths, monthName, startOfMonth } from "@/features/monthly/month";
import { addDays, dayKey } from "@/lib/dates";
import type { CheckinEntry } from "@/lib/checkins";

// Example check-ins for the months before this one, so a new install has a calendar, chart and songs to show. Pure, so it's easy to test: sampleData.ts saves them.

/** How many months before this one get sample check-ins. */
export const SAMPLE_MONTHS = 3;

/** The 1st of the earliest sample month, and the 1st of this month (where the samples stop). */
export function sampleRange(today: Date) {
  const to = startOfMonth(today);
  return { from: addMonths(to, -SAMPLE_MONTHS), to };
}

/** "July to September", for the settings row. */
export function sampleRangeLabel(today: Date) {
  const { from, to } = sampleRange(today);
  return `${monthName(from)} to ${monthName(addMonths(to, -1))}`;
}

const CHOICES: { note: Letter; mode: Mode; valence: number }[] = LETTERS.flatMap((note) =>
  (["major", "minor"] as const).map((mode) => ({ note, mode, valence: valenceOf(note, mode) })),
);

// Weights for piano, violin, harp and flute: mostly piano, as most people keep the default
const INSTRUMENT_WEIGHTS = [5, 1.5, 2, 1.5];

/**
 A believable stretch of check-ins from `from` up to `to`: most evenings logged, the odd day missed, and runs of brighter and darker days. Days in `taken` (real check-ins) are left alone.
 */
export function sampleEntries(from: Date, to: Date, taken: ReadonlySet<string>): CheckinEntry[] {
  const random = seededRandom(hashString(`samples-${dayKey(from)}`));
  const entries: CheckinEntry[] = [];
  let level = 0.6; // how bright the days are running, from 0 to 1
  let instrument: Instrument = INSTRUMENTS[0];

  for (let day = new Date(from); day < to; day = addDays(day, 1)) {
    // The mood of the days wanders, pulled gently back towards the middle
    level = Math.min(0.95, Math.max(0.1, level + (random() - 0.5) * 0.3 + (0.6 - level) * 0.12));
    if (day.getDay() === 1) instrument = pickWeighted(INSTRUMENTS, INSTRUMENT_WEIGHTS, random);

    const skipped = random() < 0.14;
    if (skipped || taken.has(dayKey(day))) continue;

    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const target = 1 + level * 8 + (weekend ? 0.6 : 0);
    const choice = pickWeighted(
      CHOICES,
      CHOICES.map((c) => Math.exp(-((c.valence - target) ** 2) / 2)),
      random,
    );

    // An evening check-in, between 7 and 10:30 pm
    const at = new Date(day);
    at.setHours(19, Math.floor(random() * 210), Math.floor(random() * 60), 0);
    entries.push({ note: choice.note, mode: choice.mode, instrument, timestamp: at.getTime() });
  }
  return entries;
}
