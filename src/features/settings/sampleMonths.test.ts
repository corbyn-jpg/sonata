import { dayKey } from "@/lib/dates";
import { sampleEntries, sampleRange, sampleRangeLabel } from "./sampleMonths";

const today = new Date(2026, 9, 16); // 16 October 2026
const { from, to } = sampleRange(today);

describe("sampleRange", () => {
  it("covers the three months before this one", () => {
    expect(from).toEqual(new Date(2026, 6, 1));
    expect(to).toEqual(new Date(2026, 9, 1));
    expect(sampleRangeLabel(today)).toBe("July to September");
  });
});

describe("sampleEntries", () => {
  const entries = sampleEntries(from, to, new Set());

  it("stays inside the range, at most one a day, in the evening", () => {
    const days = entries.map((e) => dayKey(new Date(e.timestamp)));
    expect(new Set(days).size).toBe(entries.length);
    for (const e of entries) {
      expect(e.timestamp).toBeGreaterThanOrEqual(from.getTime());
      expect(e.timestamp).toBeLessThan(to.getTime());
      const hour = new Date(e.timestamp).getHours();
      expect(hour).toBeGreaterThanOrEqual(19);
      expect(hour).toBeLessThanOrEqual(22);
    }
  });

  it("logs most days but not all of them", () => {
    const days = 92; // July, August and September
    expect(entries.length).toBeGreaterThan(days * 0.7);
    expect(entries.length).toBeLessThan(days);
  });

  it("has both brighter and darker days, and more than one instrument", () => {
    expect(new Set(entries.map((e) => e.mode))).toEqual(new Set(["major", "minor"]));
    expect(new Set(entries.map((e) => e.note)).size).toBeGreaterThan(3);
    expect(new Set(entries.map((e) => e.instrument)).size).toBeGreaterThan(1);
  });

  it("leaves days that already have a real check-in alone", () => {
    const taken = new Set(["2026-09-25", "2026-09-26", "2026-09-27"]);
    const days = sampleEntries(from, to, taken).map((e) => dayKey(new Date(e.timestamp)));
    for (const day of taken) expect(days).not.toContain(day);
  });

  it("is the same every time for the same months", () => {
    expect(sampleEntries(from, to, new Set())).toEqual(entries);
  });
});
