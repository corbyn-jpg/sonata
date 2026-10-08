import {
  LETTERS,
  displayName,
  emotionOf,
  pitchOf,
  spokenName,
  valenceOf,
} from "./notes";

describe("pitchOf", () => {
  it("keeps C major pitches on the Bright page", () => {
    expect(LETTERS.map((l) => pitchOf(l, "major"))).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
    ]);
  });

  it("uses C natural minor on the Dark page", () => {
    expect(LETTERS.map((l) => pitchOf(l, "minor"))).toEqual([
      "C",
      "D",
      "Eb",
      "F",
      "G",
      "Ab",
      "Bb",
    ]);
  });
});

describe("spokenName", () => {
  it("spells flats out for screen readers", () => {
    expect(spokenName("E", "minor")).toBe("E flat");
    expect(spokenName("E", "major")).toBe("E");
    expect(spokenName("C", "minor")).toBe("C");
  });
});

describe("valenceOf", () => {
  it("keeps every score an integer from 1 to 10", () => {
    for (const l of LETTERS) {
      for (const v of [valenceOf(l, "major"), valenceOf(l, "minor")]) {
        expect(Number.isInteger(v) && v >= 1 && v <= 10).toBe(true);
      }
    }
  });

  it("scores every major note above its minor pair", () => {
    for (const l of LETTERS)
      expect(valenceOf(l, "major")).toBeGreaterThan(valenceOf(l, "minor"));
  });
});

it("gives all 14 states a distinct emotion", () => {
  const all = LETTERS.flatMap((l) => [
    emotionOf(l, "major"),
    emotionOf(l, "minor"),
  ]);
  expect(new Set(all).size).toBe(14);
});

describe("displayName", () => {
  it("uses flat symbols for the Dark page", () => {
    expect(LETTERS.map((l) => displayName(l, "minor"))).toEqual([
      "C",
      "D",
      "E♭",
      "F",
      "G",
      "A♭",
      "B♭",
    ]);
    expect(LETTERS.map((l) => displayName(l, "major"))).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
    ]);
  });
});
