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