// Renders the 14 orb chords (7 Bright, 7 Dark) to WAV files in assets/sounds.
// Run with `npm run render:chords` after changing the voice below, then commit the files.
//
// This is plain maths — sums of sine waves — so the files come out perfectly clean.
// The phone only plays them back, so there's no real-time synthesis to crackle.
import { mkdirSync, writeFileSync } from "node:fs";

const SAMPLE_RATE = 48000; // Android's native rate, so nothing gets resampled on the phone
const LENGTH = 2.4; // seconds until each note is silent
const ROLL = 0.06; // seconds between the chord's notes, like a soft strum
const UPPER_LEVEL = 0.55; // 3rd and 5th sit under the root
const PEAK = 0.3; // leaves headroom for a few chords ringing over each other
const OCTAVE = 5; // one above middle C: cleaner on phone speakers

const SEMITONES_FROM_C = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const FLAT_IN_MINOR = new Set(["E", "A", "B"]); // C natural minor, as in src/data/notes.ts
// The 3rd makes a chord bright (4) or dark (3), so every Dark orb sounds different
const TRIADS = { major: [0, 4, 7], minor: [0, 3, 7] };

// Soft, bell-like voice: higher overtones fade sooner, so the note mellows as it rings
const PARTIALS = [
  { ratio: 1, gain: 1, decay: 1 },
  { ratio: 2, gain: 0.18, decay: 0.5 },
  { ratio: 3, gain: 0.05, decay: 0.25 },
];

const frequencyOfMidi = (midi) => 440 * 2 ** ((midi - 69) / 12);

// Exponential envelope: 40 ms rise, settle to half by 350 ms, fade to silence by the end
function envelope(t) {
  const expo = (from, to, progress) => from * (to / from) ** progress;
  if (t < 0.04) return expo(0.0001, 1, t / 0.04);
  if (t < 0.35) return expo(1, 0.5, (t - 0.04) / 0.31);
  if (t < LENGTH) return expo(0.5, 0.0001, (t - 0.35) / (LENGTH - 0.35));
  return 0;
}

function renderChord(rootMidi, mode) {
  const frames = Math.ceil((LENGTH + 2 * ROLL + 0.05) * SAMPLE_RATE);
  const samples = new Float64Array(frames);

  TRIADS[mode].forEach((interval, n) => {
    const frequency = frequencyOfMidi(rootMidi + interval);
    const level = n === 0 ? 1 : UPPER_LEVEL;
    const offset = n * ROLL;
    for (let i = 0; i < frames; i++) {
      const t = i / SAMPLE_RATE - offset;
      if (t < 0 || t >= LENGTH) continue;
      let sum = 0;
      for (const p of PARTIALS) {
        const fade = p.gain * 0.001 ** Math.min(1, t / (LENGTH * p.decay));
        sum += fade * Math.sin(2 * Math.PI * frequency * p.ratio * t);
      }
      samples[i] += level * envelope(t) * sum;
    }
  });

  // Every chord gets the same peak, so none is louder than another
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  return samples.map((s) => (s / peak) * PEAK);
}

// Seeded, so re-running the script produces identical files (no noisy git diffs)
function seededRandom(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// 16-bit mono PCM, with a touch of dither so quiet tails fade smoothly instead of stepping
function toWav(samples) {
  const random = seededRandom(7);
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => {
    const dither = (random() - random()) / 32768;
    const value = Math.max(-1, Math.min(1, s + dither));
    data.writeInt16LE(Math.round(value * 32767), i * 2);
  });

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // bytes per second
  header.writeUInt16LE(2, 32); // bytes per frame
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const outDir = new URL("../assets/sounds/", import.meta.url);
mkdirSync(outDir, { recursive: true });

for (const [letter, semitones] of Object.entries(SEMITONES_FROM_C)) {
  for (const mode of ["major", "minor"]) {
    const flat = mode === "minor" && FLAT_IN_MINOR.has(letter) ? 1 : 0;
    const rootMidi = 12 * (OCTAVE + 1) + semitones - flat;
    const file = new URL(`${letter.toLowerCase()}-${mode}.wav`, outDir);
    writeFileSync(file, toWav(renderChord(rootMidi, mode)));
    console.log(`✓ ${letter.toLowerCase()}-${mode}.wav`);
  }
}
