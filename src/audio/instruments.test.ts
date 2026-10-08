import { mostUsedInstrument } from "./instruments";

describe("mostUsedInstrument", () => {
  it("picks the instrument used most", () => {
    expect(mostUsedInstrument(["harp", "piano", "harp", undefined])).toBe(
      "harp",
    );
  });

  it("lets the later instrument win a tie", () => {
    expect(mostUsedInstrument(["piano", "violin"])).toBe("violin");
  });

  it("returns null when no instrument is known", () => {
    expect(mostUsedInstrument([undefined, undefined])).toBeNull();
  });
});
