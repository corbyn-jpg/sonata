import { barAt, barStart, clock, nextBarStart, previousBarStart, weekRange } from "./songTime";

// At 60 BPM a 4-beat bar lasts exactly 4 seconds
const TEMPO = 60;

describe("songTime", () => {
  it("finds the day playing at any moment", () => {
    expect(barAt(0, TEMPO)).toBe(0);
    expect(barAt(4.1, TEMPO)).toBe(1);
    expect(barAt(27.9, TEMPO)).toBe(6);
    expect(barAt(30, TEMPO)).toBe(6); // the ring-out after Sunday still counts as Sunday
  });

  it("goes back to the start of the day, or to the day before if already at the start", () => {
    expect(previousBarStart(10, TEMPO)).toBe(8); // mid-Wednesday → start of Wednesday
    expect(previousBarStart(8.5, TEMPO)).toBe(4); // just into Wednesday → Tuesday
    expect(previousBarStart(0.5, TEMPO)).toBe(0); // can't go before Monday
  });

  it("goes forward a day, but not past Sunday", () => {
    expect(nextBarStart(1, TEMPO)).toBe(4);
    expect(nextBarStart(25, TEMPO)).toBeNull();
  });

  it("starts each day's bar in order", () => {
    expect([0, 1, 6].map((bar) => barStart(bar, TEMPO))).toEqual([0, 4, 24]);
  });

  it("formats times and the week's dates", () => {
    expect(clock(43.9)).toBe("0:43");
    expect(clock(120)).toBe("2:00");
    expect(weekRange(new Date(2026, 8, 28))).toBe("28 Sep – 4 Oct");
  });
});