import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import {
  confirmRecords,
  localStore,
  mergeRecords,
  type SealedRecord,
} from "./sealedStore";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

const record = (
  id: string,
  updated_at: number,
  extra: Partial<SealedRecord> = {},
): SealedRecord => ({
  id,
  encrypted_payload: `sealed-${id}-${updated_at}`,
  initialization_vector_iv: `iv-${id}`,
  updated_at,
  deleted: false,
  synced: false,
  ...extra,
});

describe("mergeRecords", () => {
  it("keeps the newest version of each record", () => {
    const merged = mergeRecords(
      [record("a", 20), record("b", 10)],
      [record("a", 10), record("b", 30)],
    );
    expect(merged.map((r) => r.updated_at)).toEqual([20, 30]);
  });

  it("never forgets that Firestore confirmed a version", () => {
    expect(
      mergeRecords([record("a", 10)], [record("a", 10, { synced: true })])[0]
        .synced,
    ).toBe(true);
  });
});

describe("confirmRecords", () => {
  it("marks uploaded versions as synced and drops confirmed deletions", () => {
    const records = [
      record("a", 10),
      record("b", 10, { deleted: true }),
      record("c", 10),
    ];
    const confirmed = confirmRecords(records, [
      { id: "a", updated_at: 10 },
      { id: "b", updated_at: 10 },
    ]);
    expect(confirmed.map((r) => [r.id, r.synced])).toEqual([
      ["a", true],
      ["c", false],
    ]);
  });

  it("leaves a record pending if it changed again during the upload", () => {
    expect(
      confirmRecords([record("a", 20)], [{ id: "a", updated_at: 10 }])[0]
        .synced,
    ).toBe(false);
  });
});

describe("localStore", () => {
  it("keeps records on the phone and remembers which are uploaded", async () => {
    const store = localStore("test.records");
    await Promise.all([
      store.store([record("x", 30)]),
      store.store([record("y", 40)]),
    ]); // two saves at once
    await store.markSynced([{ id: "x", updated_at: 30 }]);
    expect((await store.all()).map((r) => [r.id, r.synced])).toEqual([
      ["x", true],
      ["y", false],
    ]);
  });

  it("keeps each collection's records apart", async () => {
    const a = localStore("test.a");
    const b = localStore("test.b");
    await a.store([record("x", 1)]);
    expect(await b.all()).toEqual([]);
  });
});
