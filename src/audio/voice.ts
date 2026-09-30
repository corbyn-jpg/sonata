import { getAudio } from "./engine";

// A soft, bell-like voice: pure sines only — buzzier waves crackle on small phone speakers
const PARTIALS = [
  { ratio: 1, gain: 1 },
  { ratio: 2, gain: 0.18 },
  { ratio: 3, gain: 0.05 },
];

// Schedule slightly ahead: by the time the audio thread sees a note, "now" has already passed,
// and envelopes that start in the past jump — which is heard as a click
const LOOKAHEAD = 0.03;

type NoteOptions = {
  /** Peak level, 0–1. Keep it gentle — notes can overlap. */
  volume?: number;
  /** Seconds until the note has fully faded. */
  length?: number;
};

/**
 * Play one synthesised note. Returns a `release` function that fades it out quickly —
 * call it when the next note starts, so fast swipes don't pile up.
 */
export function playNote(
  frequency: number,
  { volume = 0.15, length = 1.8 }: NoteOptions = {},
): () => void {
  const { context, output } = getAudio();
  const start = context.currentTime + LOOKAHEAD;
  const end = start + length;

  // Envelope: soft 40 ms attack (no click), settle, then a long fade like a struck bell
  const amp = context.createGain();
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(volume, start + 0.04);
  amp.gain.exponentialRampToValueAtTime(volume * 0.5, start + 0.35);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);

  // Darkens as it fades, which reads as more natural than a static tone
  const tone = context.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(frequency * 6, start);
  tone.frequency.exponentialRampToValueAtTime(frequency * 2, end);

  tone.connect(amp);
  amp.connect(output);

  for (const partial of PARTIALS) {
    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency * partial.ratio, start);
    const level = context.createGain();
    level.gain.setValueAtTime(partial.gain, start);
    osc.connect(level);
    level.connect(tone);
    osc.start(start);
    osc.stop(end + 0.05);
  }

  return () => {
    const at = context.currentTime + LOOKAHEAD;
    if (at >= end) return;
    // Hold wherever the envelope is, then fade from there — no jump, no click
    amp.gain.cancelAndHoldAtTime(at);
    amp.gain.setTargetAtTime(0.0001, at, 0.05);
  };
}