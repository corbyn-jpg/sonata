// The trained model (scripts/train-model.ts → model.generated.json), typed for the engine.
import type { GruWeights } from "./gru";
import trained from "./model.generated.json";

export type ChordModel = {
  opening: readonly number[];
  transitions: readonly (readonly number[])[];
};

/** Chord odds learned from Bach: major keys (for Ionian and Lydian weeks) and minor (Dorian, Aeolian). */
export const CHORD_MODELS: Record<"major" | "minor", ChordModel> =
  trained.chords;

/** The melody network's weights. */
export const MELODY_NETWORK: GruWeights = trained.melody;

/** How the trained models scored on chorales they never saw (perplexity: lower is better). */
export const EVALUATION = trained.evaluation;

/** A fixed example the app must reproduce exactly (checked in a test). */
export const CHECK = trained.check;
