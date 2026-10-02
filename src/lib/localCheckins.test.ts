import { localCheckins, markSynced, mergeCheckins, storeCheckins, type StoredCheckin } from "./localCheckins";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const record = (id: string, timestamp: number, synced = false): StoredCheckin => ({
  id,
  encrypted_payload: `sealed-${id}`,
  initialization_vector_iv: `iv-${id}`,
  valence_score: 5,
  timestamp,
  synced,
});

describe("mergeCheckins", () => {
  it("keeps one copy of each record, oldest first", () => {
    const merged = mergeCheckins([record("b", 20), record("a", 10)], [record("c", 15), record("a", 10)]);
    expect(merged.map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("never forgets that Firestore confirmed a record", () => {
    expect(mergeCheckins([record("a", 10, true)], [record("a", 10, false)])[0].synced).toBe(true);
  });
});

describe("local store", () => {
  it("keeps check-ins on the phone and remembers which are uploaded", async () => {
    await Promise.all([storeCheckins([record("x", 30)]), storeCheckins([record("y", 40)])]); // two saves at once
    expect((await localCheckins()).map((r) => r.id)).toEqual(["x", "y"]);
    await markSynced(["x"]);
    expect((await localCheckins()).map((r) => r.synced)).toEqual([true, false]);
  });
});