import {
  dialable,
  EMERGENCY,
  HELPLINES,
  isFree,
  spokenNumber,
} from "./helplines";

describe("helplines", () => {
  it("has a dialable South African number for every line", () => {
    for (const line of HELPLINES) {
      const digits = dialable(line.number);
      // A 10-digit local number starting with 0, or a short code like 116
      expect(digits).toMatch(/^(0\d{9}|\d{3,5})$/);
      if (line.sms) expect(line.sms.number).toMatch(/^\d{5}$/);
    }
    expect(dialable(EMERGENCY.number)).toBe("112");
  });

  it("gives every line its own id", () => {
    expect(new Set(HELPLINES.map((l) => l.id)).size).toBe(HELPLINES.length);
  });

  it("puts the suicide crisis line first", () => {
    expect(HELPLINES[0].number).toBe("0800 567 567");
  });

  it("only calls 0800 numbers and 116 free", () => {
    expect(isFree("0800 567 567")).toBe(true);
    expect(isFree("116")).toBe(true);
    expect(isFree("0861 322 322")).toBe(false);
    expect(isFree("(021) 712 6699")).toBe(false);
  });

  it("reads numbers out digit by digit", () => {
    expect(spokenNumber("0800 567 567")).toBe("0 8 0 0, 5 6 7, 5 6 7");
    expect(spokenNumber("(021) 712 6699")).toBe("0 2 1, 7 1 2, 6 6 9 9");
  });
});
