// Reads recorded samples and plays them back at any pitch, for scripts/render-chords.mjs.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const SAMPLE_RATE = 48000; // Android's native rate, so nothing gets resampled on the phone

const SEMITONES_FROM_C = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#4" → 61 (middle C = C4 = 60). */
export function midiOf(name) {
  const [, letter, sharp, octave] = name.match(/^([A-G])(#?)(-?\d)$/);
  return 12 * (Number(octave) + 1) + SEMITONES_FROM_C[letter] + (sharp ? 1 : 0);
}

const frequencyOfMidi = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** Any PCM or float WAV, mixed down to mono. */
export function readWav(path) {
  const buf = readFileSync(path);
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE")
    throw new Error(`${path} is not a WAV file`);

  let fmt = -1;
  let data;
  for (let p = 12; p + 8 <= buf.length; ) {
    const id = buf.toString("ascii", p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === "fmt ") fmt = p + 8;
    if (id === "data") data = { start: p + 8, size: Math.min(size, buf.length - p - 8) };
    p += 8 + size + (size % 2); // chunks are padded to an even length
  }

  let format = buf.readUInt16LE(fmt);
  const channels = buf.readUInt16LE(fmt + 2);
  const rate = buf.readUInt32LE(fmt + 4);
  const bits = buf.readUInt16LE(fmt + 14);
  if (format === 0xfffe) format = buf.readUInt16LE(fmt + 24); // WAVE_FORMAT_EXTENSIBLE
  const bytes = bits / 8;
  const read = (o) =>
    format === 3
      ? buf.readFloatLE(o)
      : bits === 16
        ? buf.readInt16LE(o) / 32768
        : bits === 24
          ? buf.readIntLE(o, 3) / 8388608
          : buf.readInt32LE(o) / 2147483648;

  const frames = Math.floor(data.size / (bytes * channels));
  const audio = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += read(data.start + (i * channels + c) * bytes);
    audio[i] = sum / channels;
  }
  return { audio, rate };
}

/** Drop the silence before the note starts, keeping 2 ms so the attack isn't clipped. */
function trimStart(audio, rate) {
  let peak = 0;
  for (const s of audio) peak = Math.max(peak, Math.abs(s));
  let start = 0;
  while (start < audio.length && Math.abs(audio[start]) < peak * 0.01) start++;
  return audio.subarray(Math.max(0, start - Math.round(0.002 * rate)));
}

/**
 * Scaled so its first 1.5 s has the same average loudness (RMS) as every other sample. Recorded
 * libraries vary a lot note to note, and a chord should be balanced.
 */
function levelled(audio, rate) {
  const frames = Math.min(audio.length, Math.round(1.5 * rate));
  let sum = 0;
  for (let i = 0; i < frames; i++) sum += audio[i] ** 2;
  const gain = 0.1 / Math.sqrt(sum / frames);
  return audio.map((s) => s * gain);
}

/**
 How far out of tune a sample is, in cents: the middle of 12 readings across its first 1.5 s, so vibrato evens out. Returns 0 if the note isn't clearly measurable.
 */
function measureCents(audio, rate, midi) {
  const readings = [];
  for (let n = 0; n < 12; n++) {
    const cents = centsAt(audio, rate, midi, Math.round((0.15 + n * 0.12) * rate));
    if (cents !== null) readings.push(cents);
  }
  if (readings.length < 4) return 0;
  readings.sort((a, b) => a - b);
  return readings[Math.floor(readings.length / 2)];
}

/**
 * One reading at `start`. Looks for the note's period near where it's expected (YIN), so an overtone can't be mistaken for it. Null if the note isn't clearly periodic there.
 */
function centsAt(audio, rate, midi, start) {
  const expected = rate / frequencyOfMidi(midi); // period in frames
  const window = Math.max(1024, Math.round(expected * 8));
  if (start + window + expected * 2 > audio.length) return null;

  const lags = [];
  for (let lag = Math.floor(expected * 2 ** (-0.7 / 12)) - 1; lag <= Math.ceil(expected * 2 ** (0.7 / 12)) + 1; lag++) {
    let diff = 0;
    let energy = 0;
    for (let i = start; i < start + window; i++) {
      const a = audio[i];
      const b = audio[i + lag];
      diff += (a - b) ** 2;
      energy += a * a + b * b;
    }
    lags.push({ lag, d: diff / energy });
  }
  let best = 1;
  for (let i = 1; i < lags.length - 1; i++) if (lags[i].d < lags[best].d) best = i;
  if (lags[best].d > 0.2) return null;

  const [a, b, c] = [lags[best - 1].d, lags[best].d, lags[best + 1].d];
  const period = lags[best].lag + (a - c) / (2 * (a - 2 * b + c) || 1);
  const cents = 1200 * Math.log2(expected / period);
  return Math.abs(cents) <= 50 ? cents : null;
}

/**
 Every WAV in `dir` whose name matches `pattern`, keyed by MIDI note. The pattern's first group is the note, e.g. "C#4". `octave` fixes libraries that number octaves differently; `tune` measures each sample and corrects it to concert pitch (leave it off for bells, whose overtones confuse the measurement).
 */
export function loadSamples(dir, pattern, { octave = 0, tune = true } = {}) {
  const samples = new Map();
  for (const file of readdirSync(dir).sort()) {
    const match = file.match(pattern);
    if (!match) continue;
    const midi = midiOf(match[1]) + 12 * octave;
    const { audio, rate } = readWav(join(dir, file));
    const trimmed = levelled(trimStart(audio, rate), rate);
    samples.set(midi, { audio: trimmed, rate, cents: tune ? measureCents(trimmed, rate, midi) : 0 });
  }
  if (samples.size === 0) throw new Error(`No samples in ${dir} match ${pattern}`);
  return samples;
}

/**
 `seconds` of `midi`, from the nearest recorded sample, resampled to 48 kHz. The nearest sample is at most a couple of semitones away, so the tone barely changes.
 */
export function renderNote(samples, midi, seconds, rate = SAMPLE_RATE) {
  let nearest;
  for (const key of samples.keys())
    if (nearest === undefined || Math.abs(key - midi) < Math.abs(nearest - midi)) nearest = key;
    const sample = samples.get(nearest);
  const step = (2 ** ((midi - nearest - sample.cents / 100) / 12) * sample.rate) / rate;
  return resample(sample.audio, step, seconds, rate);
}

/** `seconds` of a whole recording (a cymbal, wind chimes) at 48 kHz, unchanged in pitch. */
export function renderSound(path, seconds) {
  const { audio, rate } = readWav(path);
  return resample(trimStart(audio, rate), rate / SAMPLE_RATE, seconds);
}

/** Read through `audio` `step` frames at a time; a step above 1 raises the pitch. */
function resample(audio, step, seconds, rate = SAMPLE_RATE) {
  const out = new Float64Array(Math.round(seconds * rate));
  for (let i = 0; i < out.length; i++) {
    const x = i * step;
    const k = Math.floor(x);
    if (k + 2 >= audio.length) break;
    // 4-point cubic (Catmull-Rom): smoother than straight lines between samples
    const t = x - k;
    const p0 = audio[Math.max(0, k - 1)];
    const p1 = audio[k];
    const p2 = audio[k + 1];
    const p3 = audio[k + 2];
    out[i] =
      p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  }
  return out;
}
