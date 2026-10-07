import { songCacheName, withSong, withSongAt, type PlaylistSong } from "./playlistSongs";

const song = (week: string, instrument: PlaylistSong["instrument"], note: "C" | "G" = "C"): PlaylistSong => ({
  kind: "week",
  week,
  instrument,
  days: [{ note, mode: "major" }, null, null, null, null, null, null],
});

describe("withSong", () => {
  it("adds a new song at the end", () => {
    const songs = withSong([song("2026-09-21", "piano")], song("2026-09-28", "harp"));
    expect(songs.map((s) => s.week)).toEqual(["2026-09-21", "2026-09-28"]);
  });

  it("updates a week that's already there instead of adding it twice", () => {
    const songs = withSong([song("2026-09-28", "piano"), song("2026-09-21", "harp")], song("2026-09-28", "piano", "G"));
    expect(songs).toHaveLength(2);
    expect(songs[0].days[0]?.note).toBe("G"); // same place, newer notes
  });

  it("keeps the same week on another instrument as its own song", () => {
    expect(withSong([song("2026-09-28", "piano")], song("2026-09-28", "harp"))).toHaveLength(2);
  });
});

describe("withSongAt", () => {
  it("puts an undone song back where it was", () => {
    const songs = withSongAt([song("2026-09-14", "piano"), song("2026-09-28", "piano")], 1, song("2026-09-21", "piano"));
    expect(songs.map((s) => s.week)).toEqual(["2026-09-14", "2026-09-21", "2026-09-28"]);
  });

  it("doesn't add it twice if it was added again meanwhile", () => {
    expect(withSongAt([song("2026-09-21", "piano")], 0, song("2026-09-21", "piano"))).toHaveLength(1);
  });
});

describe("songCacheName", () => {
  it("changes when the notes do", () => {
    expect(songCacheName(song("2026-09-28", "piano"))).not.toBe(songCacheName(song("2026-09-28", "piano", "G")));
  });
});