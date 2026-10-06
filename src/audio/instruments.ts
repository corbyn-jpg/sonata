// Must match the instruments in scripts/render-chords.mjs (TypeScript checks the generated file).
export const INSTRUMENTS = ["piano", "violin", "harp", "flute"] as const;
export type Instrument = (typeof INSTRUMENTS)[number];

export const INSTRUMENT_LABELS: Record<Instrument, string> = {
  piano: "Piano",
  violin: "Violin",
  harp: "Harp",
  flute: "Flute",
};

export const isInstrument = (value: unknown): value is Instrument =>
  INSTRUMENTS.includes(value as Instrument);


/** The instrument used most (the latest wins a tie), or null if none is known. */
export function mostUsedInstrument(used: readonly (Instrument | undefined)[]): Instrument | null {
  const counts = new Map<Instrument, number>();
  for (const instrument of used) if (instrument) counts.set(instrument, (counts.get(instrument) ?? 0) + 1);
  let best: Instrument | null = null;
  for (const [instrument, count] of counts) if (!best || count >= counts.get(best)!) best = instrument;
  return best;
}