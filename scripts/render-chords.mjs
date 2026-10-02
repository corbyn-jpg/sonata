// Renders every orb chord (7 notes × Bright/Dark) for each instrument, single notes for the weekly songs, and the glockenspiel and wind-chime cues, from recorded samples into assets/sounds/, and writes src/audio/chords.generated.ts so the app can load them.
// Run with `npm run render:chords` after changing anything below, then commit the output.
// The sample libraries aren't in the project (they're gigabytes). By default they're read from the folder above it; set SONATA_SAMPLES to use another folder. Salamander Grand Piano V3 by Alexander Holm, CC-BY 3.0 → 44.1khz16bit/ VSCO 2 Community Edition by Versilian Studios, CC0 → Solo Violin/, Harp/, Flute/, Glock/, various/
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSamples, midiOf, renderNote, renderSound, SAMPLE_RATE } from "./samples.mjs";

const LIBRARY = process.env.SONATA_SAMPLES ?? fileURLToPath(new URL("../../", import.meta.url));
const at = (folder) => join(LIBRARY, folder);

const OCTAVE = 5; // one above middle C: clear on phone speakers
const SEMITONES_FROM_C = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const FLAT_IN_MINOR = new Set(["E", "A", "B"]); // C natural minor, as in src/data/notes.ts
// The 3rd makes a chord bright (4) or dark (3), so every Dark orb sounds different
const TRIADS = { major: [0, 4, 7], minor: [0, 3, 7] };

/** Smooth 0 → 1 ramp (no corners, so no clicks). */
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));


// Instruments. File names give each sample's note; VSCO's cello, flute and glockenspiel files are numbered an octave low, which `octave: 1` corrects (checked by measuring their pitch).

// `roll` staggers the chord's notes like a strum; `upper` is the 3rd and 5th's level under the root; `bass` adds the root an octave down; `release` is the fade at the end; `peak` evens out how loud each instrument feels. `notes` is the range of single notes rendered for the weekly songs: piano and harp also play the songs' chords and bass, so they go lower.

const INSTRUMENTS = {
  piano: {
    samples: () => loadSamples(at("44.1khz16bit"), /^([A-G]#?\d)v8\.wav$/), // 8 of 16 velocities: gentle
    seconds: 3,
    roll: 0.03,
    upper: 0.75,
    bass: 0.45,
    release: 1,
    peak: 0.32,
    notes: { low: 40, high: 88, seconds: 3 },
  },
  violin: {
    samples: () => loadSamples(at("Solo Violin/Arco Vib"), /_([A-G]#?\d)_p\.wav$/), // softly bowed
    seconds: 2.8,
    roll: 0.06,
    upper: 0.8,
    bass: 0,
    release: 0.9,
    peak: 0.28,
    notes: { low: 64, high: 88, seconds: 4 },
  },
  harp: {
    samples: () => loadSamples(at("Harp"), /_([A-G]#?\d)_(?:mp|mf|f)\.wav$/),
    seconds: 3,
    roll: 0.07, // a harp chord is always slightly spread
    upper: 0.85,
    bass: 0.5,
    release: 1.1,
    peak: 0.32,
    notes: { low: 40, high: 88, seconds: 3 },
  },
  flute: {
    samples: () => loadSamples(at("Flute/susvib"), /_([A-G]#?\d)_v1_1\.wav$/, { octave: 1 }),
    seconds: 2.6,
    roll: 0.05,
    upper: 0.8,
    bass: 0,
    release: 0.9,
    peak: 0.26,
    notes: { low: 64, high: 88, seconds: 4 },
  },
};

// Single notes are 32 kHz (plenty for phone speakers, and a third smaller), one every 3 semitones; the app shifts each by at most a semitone to play the notes in between.
const NOTE_RATE = 32000;
const NOTE_SPACING = 3;

// Short cues used around the app. Glockenspiel notes are rendered from samples; `file` cues are recordings used as they are.
const CHIMES = {
  save: { notes: ["G6", "C7"], gap: 0.11, seconds: 2.2, peak: 0.2 }, // Save check-in
  composed: { notes: ["C6", "E6", "G6", "C7"], gap: 0.14, seconds: 3, peak: 0.2 }, // week is ready
  breatheIn: { notes: ["G6"], seconds: 2, peak: 0.14 },
  breatheOut: { notes: ["C6"], seconds: 2, peak: 0.14 },
  composing: { file: "various/windchimes_slowAsc1.wav", seconds: 8, peak: 0.16 },
  finish: { file: "various/Fing_Cymb.wav", seconds: 5, peak: 0.18 }, // end of Breathing space
};

/** Mix `parts` ({ audio, at: seconds, level }) into `seconds` of audio with the given fades and peak. */
function mix(parts, seconds, release, peak) {
  const frames = Math.round(seconds * SAMPLE_RATE);
  const out = new Float64Array(frames);
  for (const { audio, at, level } of parts) {
    const offset = Math.round(at * SAMPLE_RATE);
    for (let i = 0; i < audio.length && offset + i < frames; i++) out[offset + i] += level * audio[i];
  }

  let max = 0;
  for (let i = 0; i < frames; i++) {
    // 3 ms fade in, `release` fade out, so every file starts and ends at silence
    out[i] *= ease(i / (0.003 * SAMPLE_RATE)) * ease((frames - i) / (release * SAMPLE_RATE));
    max = Math.max(max, Math.abs(out[i]));
  }
  return out.map((s) => (s / max) * peak); // every chord of an instrument peaks at the same level
}

function renderChord(instrument, samples, rootMidi, mode) {
  const { seconds, roll, upper, bass, release, peak } = instrument;
  const parts = TRIADS[mode].map((interval, n) => ({
    audio: renderNote(samples, rootMidi + interval, seconds),
    at: n * roll,
    level: n === 0 ? 1 : upper,
  }));
  if (bass > 0) parts.push({ audio: renderNote(samples, rootMidi - 12, seconds), at: 0, level: bass });
  return mix(parts, seconds + 2 * roll, release, peak);
}

/** Single notes across the instrument's range, all scaled by one gain so their balance is kept. */
function renderNotes({ low, high, seconds }, samples) {
  const notes = [];
  for (let midi = low; midi <= high; midi += NOTE_SPACING) {
    const audio = renderNote(samples, midi, seconds, NOTE_RATE);
    for (let i = 0; i < audio.length; i++)
      audio[i] *= ease(i / (0.002 * NOTE_RATE)) * ease((audio.length - i) / (0.3 * NOTE_RATE));
    notes.push({ midi, audio });
  }
  let max = 0;
  for (const { audio } of notes) for (const s of audio) max = Math.max(max, Math.abs(s));
  for (const { audio } of notes) for (let i = 0; i < audio.length; i++) audio[i] *= 0.9 / max;
  return notes;
}

function renderChime(chime, glock) {
  const { notes, file, gap = 0, seconds, peak } = chime;
  const parts = file
    ? [{ audio: renderSound(at(file), seconds), at: 0, level: 1 }]
    : notes.map((note, n) => ({ audio: renderNote(glock, midiOf(note), seconds), at: n * gap, level: 1 }));
  return mix(parts, seconds + gap * (notes?.length ?? 0), Math.min(1.2, seconds / 2), peak);
}

// Seeded, so re-running the script produces identical files (no noisy git diffs)
function seededRandom(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// 16-bit mono PCM, with a touch of dither so quiet tails fade smoothly instead of stepping
function toWav(samples, rate = SAMPLE_RATE) {
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
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28); // bytes per second
  header.writeUInt16LE(2, 32); // bytes per frame
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const soundsDir = new URL("../assets/sounds/", import.meta.url);
rmSync(soundsDir, { recursive: true, force: true }); // no stale files from older instruments

const chordLines = [];
const noteLines = [];
for (const [name, instrument] of Object.entries(INSTRUMENTS)) {
  const samples = instrument.samples();
  const dir = new URL(`${name}/`, soundsDir);
  mkdirSync(dir, { recursive: true });
  chordLines.push(`  ${name}: {`);
  for (const [letter, semitones] of Object.entries(SEMITONES_FROM_C)) {
    const files = {};
    for (const mode of ["major", "minor"]) {
      const flat = mode === "minor" && FLAT_IN_MINOR.has(letter) ? 1 : 0;
      const rootMidi = 12 * (OCTAVE + 1) + semitones - flat;
      const file = `${letter.toLowerCase()}-${mode}.wav`;
      writeFileSync(new URL(file, dir), toWav(renderChord(instrument, samples, rootMidi, mode)));
      files[mode] = `require("../../assets/sounds/${name}/${file}")`;
    }
    chordLines.push(`    ${letter}: { major: ${files.major}, minor: ${files.minor} },`);
  }
  chordLines.push("  },");

  const notesDir = new URL(`notes/${name}/`, soundsDir);
  mkdirSync(notesDir, { recursive: true });
  const notes = renderNotes(instrument.notes, samples).map(({ midi, audio }) => {
    writeFileSync(new URL(`${midi}.wav`, notesDir), toWav(audio, NOTE_RATE));
    return `[${midi}, require("../../assets/sounds/notes/${name}/${midi}.wav")]`;
  });
  noteLines.push(`  ${name}: [${notes.join(", ")}],`);
  console.log(`✓ ${name} (${samples.size} samples → 14 chords, ${notes.length} notes)`);
}

const glock = loadSamples(at("Glock"), /_([A-G]#?\d)\.wav$/, { octave: 1, tune: false });
const chimesDir = new URL("chimes/", soundsDir);
mkdirSync(chimesDir, { recursive: true });
const chimeLines = Object.entries(CHIMES).map(([name, chime]) => {
  writeFileSync(new URL(`${name}.wav`, chimesDir), toWav(renderChime(chime, glock)));
  return `  ${name}: require("../../assets/sounds/chimes/${name}.wav"),`;
});
console.log(`✓ chimes (${chimeLines.length})`);

writeFileSync(
  new URL("../src/audio/chords.generated.ts", import.meta.url),
  [
    "// Generated by scripts/render-chords.mjs (`npm run render:chords`) — don't edit by hand.",
    'import type { Letter, Mode } from "@/data/notes";',
    'import type { Instrument } from "./instruments";',
    "",
    "export const CHORDS: Record<Instrument, Record<Letter, Record<Mode, number>>> = {",
    ...chordLines,
    "};",
    "",
    "export const CHIMES = {",
    ...chimeLines,
    "} as const;",
    "",
    "export type Chime = keyof typeof CHIMES;",
    "",
    `export const NOTE_RATE = ${NOTE_RATE};`,
    "",
    "/** Single notes for the weekly songs: [MIDI note, sound] pairs, low to high. */",
    "export const NOTES: Record<Instrument, readonly (readonly [number, number])[]> = {",
    ...noteLines,
    "};",
    "",
  ].join("\n"),
);
console.log("✓ src/audio/chords.generated.ts");