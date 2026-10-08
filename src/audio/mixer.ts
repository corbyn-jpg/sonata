// Turns a composed song into audio: each note is the nearest recorded sample, shifted by at most a semitone, placed at its time and mixed. Pure maths on arrays (no files), so it runs anywhere.
import type { Composition, NoteEvent } from "@/engine";

/** One recorded note: its MIDI pitch and its sound (mono, -1 to 1). */
export type NoteSample = { midi: number; audio: Float32Array };

/** How loud each part is in the mix: the melody sits on top. */
const PART_GAIN: Record<NoteEvent["part"], number> = {
  melody: 1,
  chords: 0.38,
  bass: 0.55,
};

const RELEASE = 0.35; // seconds a note takes to fade once it ends
const TAIL = 2.5; // seconds after the last beat, so the final chord can ring out

/** Reads our own 16-bit mono WAV files (see scripts/render-chords.mjs). */
export function decodeWav(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const id = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (id === "data") {
      const audio = new Float32Array(Math.floor(size / 2));
      for (let i = 0; i < audio.length; i++)
        audio[i] = view.getInt16(offset + 8 + i * 2, true) / 32768;
      return audio;
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error("No audio data in WAV file");
}

/** 16-bit mono PCM WAV. */
export function encodeWav(audio: Float32Array, rate: number): Uint8Array {
  const bytes = new Uint8Array(44 + audio.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (at: number, s: string) =>
    [...s].forEach((c, i) => (bytes[at + i] = c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + audio.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true); // bytes per second
  view.setUint16(32, 2, true); // bytes per frame
  view.setUint16(34, 16, true); // bits per sample
  text(36, "data");
  view.setUint32(40, audio.length * 2, true);
  for (let i = 0; i < audio.length; i++) {
    const s = Math.max(-1, Math.min(1, audio[i]));
    view.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }
  return bytes;
}

/** The recorded note closest in pitch to `midi`. */
export function nearestSample(
  samples: readonly NoteSample[],
  midi: number,
): NoteSample {
  return samples.reduce((best, s) =>
    Math.abs(s.midi - midi) < Math.abs(best.midi - midi) ? s : best,
  );
}

/** Length of the rendered song in seconds, including the final ring-out. */
export const songSeconds = (song: Composition) =>
  (song.beats * 60) / song.tempo + TAIL;

/**
 * The song as audio at `rate`. The melody uses the chosen instrument; chords and bass use
 * `accompaniment` (piano or harp, which reach low enough).
 */
export function mixSong(
  song: Composition,
  samples: {
    melody: readonly NoteSample[];
    accompaniment: readonly NoteSample[];
  },
  rate: number,
): Float32Array {
  const secondsPerBeat = 60 / song.tempo;
  const out = new Float32Array(Math.ceil(songSeconds(song) * rate));
  const releaseFrames = RELEASE * rate;

  for (const event of song.events) {
    const { audio, midi } = nearestSample(
      event.part === "melody" ? samples.melody : samples.accompaniment,
      event.midi,
    );
    const step = 2 ** ((event.midi - midi) / 12); // > 1 reads faster, so sounds higher
    const start = Math.round(event.start * secondsPerBeat * rate);
    const held = event.duration * secondsPerBeat * rate;
    const end = Math.min(
      Math.floor(held + releaseFrames),
      Math.floor((audio.length - 2) / step), // the recording runs out
      out.length - start,
    );
    const heldEnd = Math.min(end, Math.ceil(held));
    const gain = event.velocity * PART_GAIN[event.part];

    // Two plain loops (held, then fading out) rather than one with a branch: this runs on the phone
    // millions of times per song. Each value is a straight line between the two nearest samples.
    let x = 0;
    for (let i = 0; i < heldEnd; i++, x += step) {
      const k = x | 0;
      const a = audio[k];
      out[start + i] += (a + (audio[k + 1] - a) * (x - k)) * gain;
    }
    for (let i = heldEnd; i < end; i++, x += step) {
      const k = x | 0;
      const a = audio[k];
      out[start + i] +=
        (a + (audio[k + 1] - a) * (x - k)) *
        gain *
        (1 - (i - held) / releaseFrames);
    }
  }

  // Bring the loudest moment to just under full scale, and fade the very end
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  const scale = peak > 0 ? 0.89 / peak : 1;
  const fadeFrames = Math.round(0.5 * rate);
  for (let i = 0; i < out.length; i++) {
    const fromEnd = out.length - i;
    out[i] *= scale * (fromEnd < fadeFrames ? fromEnd / fadeFrames : 1);
  }
  return out;
}
