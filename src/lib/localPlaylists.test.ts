import {
  confirmPlaylists,
  localPlaylists,
  markPlaylistsSynced,
  mergePlaylists,
  storePlaylists,
  type StoredPlaylist,
} from "./localPlaylists";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

const record = (id: string, updated_at: number, extra: Partial<StoredPlaylist> = {}): StoredPlaylist => ({
  id,
  encrypted_payload: `sealed-${id}-${updated_at}`,
  initialization_vector_iv: `iv-${id}`,
  updated_at,
  deleted: false,
  synced: false,
  ...extra,
});

describe("mergePlaylists", () => {
  it("keeps the newest version of each playlist", () => {
    const merged = mergePlaylists([record("a", 20), record("b", 10)], [record("a", 10), record("b", 30)]);
    expect(merged.map((r) => r.updated_at)).toEqual([20, 30]);
  });

  it("never forgets that Firestore confirmed a version", () => {
    expect(mergePlaylists([record("a", 10)], [record("a", 10, { synced: true })])[0].synced).toBe(true);
  });
});

describe("confirmPlaylists", () => {
  it("marks uploaded versions as synced and drops confirmed deletions", () => {
    const records = [record("a", 10), record("b", 10, { deleted: true }), record("c", 10)];
    const confirmed = confirmPlaylists(records, [
      { id: "a", updated_at: 10 },
      { id: "b", updated_at: 10 },
    ]);
    expect(confirmed.map((r) => [r.id, r.synced])).toEqual([
      ["a", true],
      ["c", false],
    ]);
  });

  it("leaves a playlist pending if it changed again during the upload", () => {
    expect(confirmPlaylists([record("a", 20)], [{ id: "a", updated_at: 10 }])[0].synced).toBe(false);
  });
});

describe("local store", () => {
  it("keeps playlists on the phone and remembers which are uploaded", async () => {
    await Promise.all([storePlaylists([record("x", 30)]), storePlaylists([record("y", 40)])]); // two saves at once
    await markPlaylistsSynced([{ id: "x", updated_at: 30 }]);
    expect((await localPlaylists()).map((r) => [r.id, r.synced])).toEqual([
      ["x", true],
      ["y", false],
    ]);
  });
});