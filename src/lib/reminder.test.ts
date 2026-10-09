import { stepTime, timeLabel } from "./reminder";

jest.mock("expo", () => ({ requireOptionalNativeModule: () => null }));

describe("reminder time", () => {
  it("writes the time as a 24-hour clock", () => {
    expect(timeLabel(21 * 60 + 30)).toBe("21:30");
    expect(timeLabel(7 * 60 + 5)).toBe("07:05");
  });

  it("moves in quarter-hours and wraps round midnight", () => {
    expect(stepTime(21 * 60 + 30, 1)).toBe(21 * 60 + 45);
    expect(stepTime(23 * 60 + 45, 1)).toBe(0);
    expect(stepTime(0, -1)).toBe(23 * 60 + 45);
  });
});
