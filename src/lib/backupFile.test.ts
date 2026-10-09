import {
  isBackup,
  lockBackup,
  NotABackup,
  unlockBackup,
  WrongPassphrase,
} from "./backupFile";

const CHEAP = { N: 16, r: 8, p: 1 }; // fast for tests; the app uses COST
let next = 0;
const random = (length: number) =>
  Uint8Array.from({ length }, () => next++ % 256);

const content = { reflection: "Long day — café ☕", notes: ["E", "A"] };
const lock = (passphrase = "a quiet river") =>
  lockBackup(content, passphrase, random, undefined, CHEAP);

describe("backup file", () => {
  it("opens with the same passphrase", async () => {
    expect(await unlockBackup(await lock(), "a quiet river")).toEqual(content);
  });

  it("treats é typed as one character or two as the same passphrase", async () => {
    const file = await lock("caf\u00e9 au lait");
    expect(await unlockBackup(file, "cafe\u0301 au lait")).toEqual(content);
  });

  it("never holds the content in plain text", async () => {
    const file = await lock();
    expect(file).not.toContain("Long day");
    expect(file).not.toContain("a quiet river");
  });

  it("refuses the wrong passphrase", async () => {
    await expect(
      unlockBackup(await lock(), "a loud river"),
    ).rejects.toBeInstanceOf(WrongPassphrase);
  });

  it("refuses a file that has been changed", async () => {
    const file = JSON.parse(await lock());
    file.encrypted_payload = file.encrypted_payload.replace(
      /.$/,
      (c: string) => (c === "0" ? "1" : "0"),
    );
    await expect(
      unlockBackup(JSON.stringify(file), "a quiet river"),
    ).rejects.toBeInstanceOf(WrongPassphrase);
  });

  it("knows a backup from any other file", async () => {
    expect(isBackup(await lock())).toBe(true);
    for (const text of ["hello", "null", "{}", '{"app":"Sonata backup"}'])
      expect(isBackup(text)).toBe(false);
  });

  it("refuses a cost big enough to run the phone out of memory", async () => {
    const file = JSON.parse(await lock());
    file.scrypt.N = 2 ** 20;
    await expect(
      unlockBackup(JSON.stringify(file), "a quiet river"),
    ).rejects.toBeInstanceOf(NotABackup);
  });
});
