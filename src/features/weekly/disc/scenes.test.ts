import type { DayNote, WeekMode } from "@/engine";
import type { Painter } from "./painter";
import { drawDisc, SCENE_FOR_MODE } from "./scenes";

/** A painter that just writes down what it was asked to draw. */
function recorder() {
  const calls: string[] = [];
  const log =
    (name: string) =>
    (...args: unknown[]) =>
      calls.push(`${name}(${JSON.stringify(args)})`);
  const painter: Painter = {
    circle: log("circle"),
    arc: log("arc"),
    polyline: log("polyline"),
    rect: log("rect"),
    clipCircle: log("clipCircle"),
    save: log("save"),
    restore: log("restore"),
    translate: log("translate"),
    rotate: log("rotate"),
    scale: log("scale"),
  };
  return { painter, calls };
}

const B = (note: DayNote["note"]): DayNote => ({ note, mode: "major" });
const WEEK = [B("C"), B("E"), null, B("G"), B("A"), B("F"), B("B")];
const PALETTE: [DayNote, DayNote] = [B("E"), B("A")];
const MODES: WeekMode[] = ["ionian", "lydian", "dorian", "aeolian"];

const draw = (mode: WeekMode, seed = "2026-09-28", week = WEEK) => {
  const { painter, calls } = recorder();
  drawDisc(painter, 600, week, PALETTE, mode, seed);
  return calls;
};

describe("disc scenes", () => {
  it("gives each mode its own scene", () => {
    expect(new Set(Object.values(SCENE_FOR_MODE)).size).toBe(4);
  });

  it("paints every scene, clipped to the disc, with save and restore balanced", () => {
    for (const mode of MODES) {
      const calls = draw(mode);
      expect(calls[1]).toBe(`clipCircle([300,300,300])`);
      const count = (name: string) => calls.filter((c) => c.startsWith(`${name}(`)).length;
      expect(count("save")).toBe(count("restore"));
    }
  });

  it("paints the same week the same way every time", () => {
    for (const mode of MODES) expect(draw(mode)).toEqual(draw(mode));
  });

  it("gives a different picture to a different week", () => {
    for (const mode of MODES) expect(draw(mode, "2026-10-05")).not.toEqual(draw(mode));
  });

  it("draws something for each logged day (fewer days, fewer marks)", () => {
    const fewer = [B("C"), null, null, null, null, null, B("B")];
    for (const mode of MODES) expect(draw(mode, "x", fewer).length).toBeLessThan(draw(mode, "x").length);
  });
});