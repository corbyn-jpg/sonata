import { frequencyOf, midiOf } from "./pitch";

describe("midiOf", () => {
  it("puts middle C at 60 and A4 at 69", () => {
    expect(midiOf("C")).toBe(60);
    expect(midiOf("A")).toBe(69);
  });

  it("puts flats a semitone below their natural", () => {
    expect(midiOf("Eb")).toBe(midiOf("E") - 1);
    expect(midiOf("Ab")).toBe(midiOf("A") - 1);
    expect(midiOf("Bb")).toBe(midiOf("B") - 1);
  });

  it("moves by 12 per octave", () => {
    expect(midiOf("C", 5)).toBe(72);
  });
});

describe("frequencyOf", () => {
  it("tunes A4 to 440 Hz", () => {
    expect(frequencyOf("A")).toBe(440);
  });

  it("matches standard pitches", () => {
    expect(frequencyOf("C")).toBeCloseTo(261.63, 2);
    expect(frequencyOf("Eb")).toBeCloseTo(311.13, 2);
    expect(frequencyOf("B")).toBeCloseTo(493.88, 2);
  });

  it("doubles each octave", () => {
    expect(frequencyOf("G", 5)).toBeCloseTo(frequencyOf("G") * 2, 6);
  });
});