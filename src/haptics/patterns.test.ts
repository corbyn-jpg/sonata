import { LETTERS } from "@/data/notes";
import {
  FEEL,
  GROUP_GAP,
  degreeOf,
  pulsesFor,
  toVibrationPattern,
} from "./patterns";

describe("pulsesFor", () => {
  it("gives each note as many pulses as its scale degree", () => {
    for (const letter of LETTERS) {
      expect(pulsesFor(letter, "major")).toHaveLength(degreeOf(letter));
      expect(pulsesFor(letter, "minor")).toHaveLength(degreeOf(letter));
    }
  });

  it("makes Dark pulses longer and slower than Bright ones", () => {
    const bright = pulsesFor("E", "major");
    const dark = pulsesFor("E", "minor");
    expect(dark[0].duration).toBeGreaterThan(bright[0].duration);
    expect(dark[1].at).toBeGreaterThan(bright[1].at);
  });

  it("separates groups with a longer pause, so 5 reads as 3 + 2", () => {
    const g = pulsesFor("G", "major"); // degree 5
    const { pulse, gap } = FEEL.major;
    expect(g[1].at - g[0].at).toBe(pulse + gap); // inside the first group
    expect(g[3].at - g[2].at).toBe(pulse + GROUP_GAP); // between groups
  });

  it("gives every note in a mode a different pattern", () => {
    const patterns = LETTERS.map((l) => JSON.stringify(pulsesFor(l, "major")));
    expect(new Set(patterns).size).toBe(LETTERS.length);
  });
});

describe("toVibrationPattern", () => {
  it("starts immediately and alternates buzz and pause", () => {
    expect(
      toVibrationPattern([
        { at: 0, duration: 30 },
        { at: 120, duration: 30 },
      ]),
    ).toEqual([0, 30, 90, 30]);
  });

  it("turns C into a single buzz", () => {
    expect(toVibrationPattern(pulsesFor("C", "minor"))).toEqual([
      0,
      FEEL.minor.pulse,
    ]);
  });
});