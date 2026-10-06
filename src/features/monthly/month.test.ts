import { dayKey } from "@/lib/dates";
import { addMonths, monthGrid, monthTitle, summariseMonth, weeksOfMonth, type DatedNote } from "./month";

// Month is 0-based: new Date(2026, 9, 1) is Thursday 1 October 2026
const october = new Date(2026, 9, 1);
const at = (day: number, note: DatedNote["note"], mode: DatedNote["mode"], hour = 21): DatedNote => ({
  note,
  mode,
  timestamp: new Date(2026, 9, day, hour),
});

describe("monthGrid", () => {
  it("starts on Monday and pads the first and last rows", () => {
    const rows = monthGrid(october);
    expect(rows).toHaveLength(5);
    expect(rows[0].slice(0, 3)).toEqual([null, null, null]); // Mon–Wed before the 1st
    expect(rows[0][3]?.getDate()).toBe(1);
    expect(rows[4][5]?.getDate()).toBe(31); // Saturday the 31st
    expect(rows[4][6]).toBeNull();
  });

  it("handles a month that starts on a Monday", () => {
    expect(monthGrid(new Date(2026, 5, 1))[0][0]?.getDate()).toBe(1); // June 2026
  });
});

describe("weeksOfMonth", () => {
  it("lists the Mondays that fall in the month", () => {
    expect(weeksOfMonth(october).map(dayKey)).toEqual(["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
  });

  it("includes the 1st when it is a Monday", () => {
    expect(dayKey(weeksOfMonth(new Date(2026, 5, 1))[0])).toBe("2026-06-01");
  });
});

describe("addMonths and monthTitle", () => {
  it("steps across the end of the year", () => {
    expect(monthTitle(addMonths(new Date(2026, 11, 1), 1))).toBe("January 2027");
    expect(monthTitle(addMonths(october, -10))).toBe("December 2025");
  });
});

describe("summariseMonth", () => {
  it("keeps the latest check-in of each day and counts the month's days", () => {
    const summary = summariseMonth([at(2, "C", "major", 9), at(2, "A", "minor", 22), at(3, "G", "major")], october);
    expect(summary.days.get("2026-10-02")).toEqual({ note: "A", mode: "minor" });
    expect(summary.loggedDays).toBe(2);
  });

  it("only counts days in the month itself", () => {
    const november1: DatedNote = { note: "C", mode: "major", timestamp: new Date(2026, 10, 1, 9) };
    expect(summariseMonth([november1], october).loggedDays).toBe(0);
  });

  it("gives each week starting in the month a mode, or none if it has no check-ins", () => {
    const summary = summariseMonth([at(5, "G", "major"), at(6, "E", "major"), at(13, "A", "minor")], october);
    expect(summary.weeks.map((w) => w.mode)).toEqual(["ionian", expect.any(String), null, null]);
    expect(summary.weeks[0].averageValence).toBeGreaterThan(5);
    expect(summary.melodies).toBe(2);
  });

  it("finds the most-used mode, with the latest week winning a tie", () => {
    const summary = summariseMonth([at(5, "G", "major"), at(12, "A", "minor"), at(13, "B", "minor")], october);
    const [first, second] = summary.weeks;
    expect(first.mode).not.toBe(second.mode);
    expect(summary.mostUsedMode).toEqual({ mode: second.mode, weeks: 1 });
  });

  it("has nothing to report for an empty month", () => {
    const summary = summariseMonth([], october);
    expect(summary).toMatchObject({ loggedDays: 0, melodies: 0, mostUsedMode: null });
  });
});