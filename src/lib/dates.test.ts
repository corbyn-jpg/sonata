import {
  addDays,
  dayKey,
  startOfWeek,
  streakLength,
  fromDayKey,
} from "./dates";

// Month is 0-based: new Date(2026, 8, 30) is Wednesday 30 September 2026
const wed = new Date(2026, 8, 30, 15, 30);

describe("dayKey", () => {
  it("uses the local calendar date", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("fromDayKey", () => {
  it("turns a day key back into that local date", () => {
    expect(dayKey(fromDayKey("2026-09-28"))).toBe("2026-09-28");
    expect(fromDayKey("2026-01-05").getHours()).toBe(0);
  });
});

describe("startOfWeek", () => {
  it("returns Monday 00:00 for a midweek day", () => {
    const monday = startOfWeek(wed);
    expect(dayKey(monday)).toBe("2026-09-28");
    expect(monday.getHours()).toBe(0);
  });

  it("treats Sunday as the end of the week, not the start", () => {
    expect(dayKey(startOfWeek(new Date(2026, 9, 4)))).toBe("2026-09-28");
  });

  it("keeps Monday as its own week start", () => {
    expect(dayKey(startOfWeek(new Date(2026, 8, 28, 9)))).toBe("2026-09-28");
  });
});

describe("streakLength", () => {
  const daysAgo = (n: number) => addDays(wed, -n);

  it("is 0 with no check-ins", () => {
    expect(streakLength([], wed)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(streakLength([daysAgo(0), daysAgo(1), daysAgo(2)], wed)).toBe(3);
  });

  it("still counts up to yesterday before today's check-in", () => {
    expect(streakLength([daysAgo(1), daysAgo(2)], wed)).toBe(2);
  });

  it("stops at the first missed day", () => {
    expect(streakLength([daysAgo(0), daysAgo(1), daysAgo(3)], wed)).toBe(2);
  });

  it("is 0 when the last check-in was two days ago", () => {
    expect(streakLength([daysAgo(2), daysAgo(3)], wed)).toBe(0);
  });

  it("counts several check-ins on one day once", () => {
    const twiceToday = [daysAgo(0), new Date(2026, 8, 30, 8), daysAgo(1)];
    expect(streakLength(twiceToday, wed)).toBe(2);
  });
});
