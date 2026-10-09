import {
  BackupUnreachable,
  deleteEverything,
  isConfirmed,
  type Wipe,
} from "./deleteEverything";

function steps(failServer = false, failAccount = false) {
  const done: string[] = [];
  const step =
    (name: string, fail = false) =>
    async () => {
      if (fail) throw new Error(`${name} failed`);
      done.push(name);
    };
  const wipe: Wipe = {
    deleteServerData: step("server", failServer),
    deleteAccount: step("account", failAccount),
    wipePhone: step("phone"),
    restart: step("restart"),
  };
  return { wipe, done };
}

describe("delete all data", () => {
  it("deletes the backup, then the account, then the phone, then restarts", async () => {
    const { wipe, done } = steps();
    await deleteEverything(wipe);
    expect(done).toEqual(["server", "account", "phone", "restart"]);
  });

  it("touches nothing on the phone if the backup can't be reached", async () => {
    const { wipe, done } = steps(true);
    await expect(deleteEverything(wipe)).rejects.toBeInstanceOf(
      BackupUnreachable,
    );
    expect(done).toEqual([]);
  });

  it("carries on if only the account can't be deleted", async () => {
    const { wipe, done } = steps(false, true);
    await deleteEverything(wipe);
    expect(done).toEqual(["server", "phone", "restart"]);
  });

  it("needs the word typed out", () => {
    expect(isConfirmed("delete")).toBe(true);
    expect(isConfirmed("  Delete ")).toBe(true);
    expect(isConfirmed("del")).toBe(false);
    expect(isConfirmed("")).toBe(false);
  });
});
