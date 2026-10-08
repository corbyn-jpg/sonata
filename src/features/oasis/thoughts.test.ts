import {
  canSave,
  cleanRecord,
  headline,
  MAX_FIELD_LENGTH,
  PATTERNS,
  patternOf,
  recordDate,
  type ThoughtRecord,
} from "./thoughts";

const blank: ThoughtRecord = {
  situation: "",
  thought: "",
  pattern: null,
  balanced: "",
};

describe("thought records", () => {
  it("needs only the thought itself", () => {
    expect(canSave(blank)).toBe(false);
    expect(canSave({ ...blank, thought: "   " })).toBe(false);
    expect(canSave({ ...blank, thought: "I'll never get this done" })).toBe(
      true,
    );
  });

  it("trims every field and keeps it within length", () => {
    const record = cleanRecord({
      situation: "  studio  ",
      thought: "x".repeat(900),
      pattern: "labelling",
      balanced: " ok ",
    });
    expect(record).toEqual({
      situation: "studio",
      thought: "x".repeat(MAX_FIELD_LENGTH),
      pattern: "labelling",
      balanced: "ok",
    });
  });

  it("shows the balanced thought in the list, or the thought if there isn't one", () => {
    expect(headline({ ...blank, thought: "a", balanced: "b" })).toBe("b");
    expect(headline({ ...blank, thought: "a" })).toBe("a");
  });

  it("explains every pattern in a line, and allows not being sure", () => {
    for (const p of PATTERNS) expect(p.meaning.length).toBeGreaterThan(10);
    expect(patternOf("unsure")?.name).toBe("Not sure");
    expect(patternOf(null)).toBeNull();
  });

  it("dates a record by weekday, day and month", () => {
    expect(recordDate(new Date(2026, 9, 6, 21).getTime())).toBe("Tue 6 Oct");
  });
});
