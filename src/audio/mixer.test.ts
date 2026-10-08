import { composeWeek, type Composition } from "@/engine";
import {
  decodeWav,
  encodeWav,
  mixSong,
  nearestSample,
  songSeconds,
  type NoteSample,
} from "./mixer";

const RATE = 8000;
const frequencyOf = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** A plain sine "recording" of `midi`, 2 s long. */
const sine = (midi: number): NoteSample => ({
  midi,
  audio: Float32Array.from(
    { length: 2 * RATE },
    (_, i) => 0.5 * Math.sin((2 * Math.PI * frequencyOf(midi) * i) / RATE),
  ),
});

/** Pitch by counting upward zero crossings over `seconds`. */
function measureHz(audio: Float32Array, from: number, seconds: number) {
  let crossings = 0;
  const start = Math.round(from * RATE);
  const end = start + Math.round(seconds * RATE);
  for (let i = start + 1; i < end; i++)
    if (audio[i - 1] < 0 && audio[i] >= 0) crossings++;
  return crossings / seconds;
}

const oneNote = (midi: number): Composition => ({
  mode: "ionian",
  tempo: 60, // 1 beat = 1 second
  averageValence: 7,
  picardy: false,
  bars: [],
  events: [{ part: "melody", midi, start: 0, duration: 1, velocity: 1 }],
  palette: [
    { note: "C", mode: "major" },
    { note: "C", mode: "major" },
  ],
  beats: 1,
});

describe("mixer", () => {
  it("round-trips audio through a WAV file", () => {
    const audio = Float32Array.from([0, 0.5, -0.5, 0.25]);
    const decoded = decodeWav(encodeWav(audio, RATE));
    decoded.forEach((s, i) => expect(s).toBeCloseTo(audio[i], 4));
  });

  it("uses the nearest recorded note", () => {
    expect(nearestSample([sine(60), sine(63), sine(66)], 62).midi).toBe(63);
  });

  it("shifts a sample to the exact pitch asked for", () => {
    const out = mixSong(
      oneNote(61),
      { melody: [sine(60)], accompaniment: [sine(60)] },
      RATE,
    );
    expect(measureHz(out, 0.1, 0.8)).toBeCloseTo(frequencyOf(61), -1); // C♯4 ≈ 277 Hz, within 5 Hz
  });

  it("peaks just under full scale and ends in silence", () => {
    const song = composeWeek(
      [
        { note: "C", mode: "major" },
        { note: "E", mode: "major" },
        null,
        { note: "G", mode: "minor" },
        { note: "A", mode: "major" },
        { note: "F", mode: "major" },
        { note: "C", mode: "major" },
      ],
      "test",
    );
    const notes = [
      40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 73, 76, 79, 82, 85, 88,
    ].map(sine);
    const out = mixSong(song, { melody: notes, accompaniment: notes }, RATE);
    expect(out.length).toBe(Math.ceil(songSeconds(song) * RATE));
    expect(out.reduce((max, s) => Math.max(max, Math.abs(s)), 0)).toBeCloseTo(
      0.89,
      2,
    );
    expect(Math.abs(out[out.length - 1])).toBeLessThan(0.001);
  });
});
