import { breathAt, CYCLES, EXHALE, INHALE, SESSION, stepOf } from "./breathing";

describe("breathAt", () => {
  it("breathes in for 4 seconds, then out for 6", () => {
    expect(breathAt(0)).toMatchObject({ cycle: 1, phase: "in", fullness: 0 });
    expect(breathAt(INHALE - 0.01).phase).toBe("in");
    expect(breathAt(INHALE)).toMatchObject({ cycle: 1, phase: "out", fullness: 1 });
    expect(breathAt(INHALE + EXHALE)).toMatchObject({ cycle: 2, phase: "in" });
  });

  it("fills and empties smoothly", () => {
    expect(breathAt(INHALE / 2).fullness).toBeCloseTo(0.5);
    expect(breathAt(INHALE + EXHALE / 2).fullness).toBeCloseTo(0.5);
    for (let s = 0; s < SESSION; s += 0.37) {
      const { fullness } = breathAt(s);
      expect(fullness).toBeGreaterThanOrEqual(0);
      expect(fullness).toBeLessThanOrEqual(1);
    }
  });

  it("lasts six breaths, a minute, then finishes", () => {
    expect(SESSION).toBe(60);
    expect(breathAt(SESSION - 0.01).cycle).toBe(CYCLES);
    expect(breathAt(SESSION)).toMatchObject({ phase: "done", progress: 1 });
    expect(breathAt(SESSION / 2).progress).toBeCloseTo(0.5);
  });
});

describe("stepOf", () => {
  it("changes exactly when the phase does", () => {
    const steps = new Set<number>();
    for (let s = 0; s <= SESSION; s += 0.25) steps.add(stepOf(breathAt(s)));
    expect(steps.size).toBe(CYCLES * 2 + 1); // every in, every out, and the end
    expect(steps.has(-1)).toBe(true);
  });
});