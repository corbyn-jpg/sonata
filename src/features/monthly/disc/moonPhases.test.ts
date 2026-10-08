import type { DayNote, Week } from "@/engine";
import type { Painter } from "@/features/weekly/disc/painter";
import { drawMonthDisc, moonLight } from "./moonPhases";

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
const D = (note: DayNote["note"]): DayNote => ({ note, mode: "minor" });
const BRIGHT: Week = [B("E"), B("A"), B("B"), B("E"), null, B("F"), B("A")];
const HEAVY: Week = [D("C"), D("A"), D("D"), D("C"), D("B"), null, D("A")];
const EMPTY: Week = Array(7).fill(null);
const WEEKS = [BRIGHT, HEAVY, EMPTY, BRIGHT];
const DAYS = [null, null, null, ...WEEKS.flat()]; // the month's days, starting on a Thursday

const draw = (days = DAYS, weeks = WEEKS, seed = "2026-10-01") => {
  const { painter, calls } = recorder();
  drawMonthDisc(painter, 600, days, weeks, seed);
  return calls;
};
const count = (calls: string[], name: string) =>
  calls.filter((c) => c.startsWith(`${name}(`)).length;

describe("moonLight", () => {
  it("makes a brighter week a fuller moon", () => {
    expect(moonLight(BRIGHT)).toBeGreaterThan(moonLight(HEAVY));
  });

  it("keeps even the heaviest week a crescent, and a week without check-ins a new moon", () => {
    expect(moonLight(HEAVY)).toBeGreaterThanOrEqual(0.25);
    expect(moonLight(BRIGHT)).toBeLessThanOrEqual(1);
    expect(moonLight(EMPTY)).toBe(0);
  });
});

describe("drawMonthDisc", () => {
  it("is clipped to the disc, with save and restore balanced", () => {
    const calls = draw();
    expect(calls[1]).toBe("clipCircle([300,300,300])");
    expect(count(calls, "save")).toBe(count(calls, "restore"));
  });

  it("draws a lit moon for each week with check-ins (each clipped for its shadow)", () => {
    expect(count(draw(), "clipCircle")).toBe(1 + 3); // the disc, then three lit moons
  });

  it("paints the same month the same way every time, and a different month differently", () => {
    expect(draw()).toEqual(draw());
    expect(draw(DAYS, WEEKS, "2026-11-01")).not.toEqual(draw());
  });

  it("lights a bead for every logged day", () => {
    const fewer = DAYS.map((d, i) => (i % 2 ? null : d));
    expect(count(draw(fewer), "circle")).toBeLessThan(count(draw(), "circle"));
  });
});
