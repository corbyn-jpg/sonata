import type { Letter } from "@/data/notes";
import {
  sameSong,
  songCacheName,
  songPalette,
  withSong,
  withSongAt,
  type PlaylistPiece,
  type PlaylistSong,
} from "./playlistSongs";

const song = (
  week: string,
  instrument: PlaylistSong["instrument"],
  note: "C" | "G" = "C",
): PlaylistSong => ({
  kind: "week",
  week,
  instrument,
  days: [{ note, mode: "major" }, null, null, null, null, null, null],
});

const piece = (
  id: string,
  instrument: PlaylistSong["instrument"],
  tune: Letter[] = ["C", "E", "G"],
): PlaylistPiece => ({
  kind: "piece",
  id,
  name: "Morning",
  instrument,
  piece: { mode: "major", steps: tune, tempo: 96, harmony: true },
});

/** Each song's week, or its piece's id. */
const ids = (songs: PlaylistSong[]) =>
  songs.map((s) => (s.kind === "week" ? s.week : s.id));

describe("withSong", () => {
  it("adds a new song at the end", () => {
    const songs = withSong(
      [song("2026-09-21", "piano")],
      song("2026-09-28", "harp"),
    );
    expect(ids(songs)).toEqual(["2026-09-21", "2026-09-28"]);
  });

  it("updates a week that's already there instead of adding it twice", () => {
    const songs = withSong(
      [song("2026-09-28", "piano"), song("2026-09-21", "harp")],
      song("2026-09-28", "piano", "G"),
    );
    expect(songs).toHaveLength(2);
    const first = songs[0];
    expect(first.kind === "week" && first.days[0]?.note).toBe("G"); // same place, newer notes
  });

  it("keeps the same week on another instrument as its own song", () => {
    expect(
      withSong([song("2026-09-28", "piano")], song("2026-09-28", "harp")),
    ).toHaveLength(2);
  });
});

describe("pieces in playlists", () => {
  it("updates a piece that's already there after it's been edited", () => {
    const songs = withSong(
      [piece("abc", "harp"), song("2026-09-28", "piano")],
      piece("abc", "harp", ["G"]),
    );
    expect(ids(songs)).toEqual(["abc", "2026-09-28"]);
    const first = songs[0];
    expect(first.kind === "piece" && first.piece.steps).toEqual(["G"]);
  });

  it("never mistakes a piece for a week", () => {
    expect(sameSong(piece("abc", "piano"), song("abc", "piano"))).toBe(false);
  });

  it("takes its record colours from the notes used most", () => {
    const [main] = songPalette(piece("abc", "piano", ["E", "C", "E"]));
    expect(main).toEqual({ note: "E", mode: "major" });
  });
});

describe("withSongAt", () => {
  it("puts an undone song back where it was", () => {
    const songs = withSongAt(
      [song("2026-09-14", "piano"), song("2026-09-28", "piano")],
      1,
      song("2026-09-21", "piano"),
    );
    expect(ids(songs)).toEqual(["2026-09-14", "2026-09-21", "2026-09-28"]);
  });

  it("doesn't add it twice if it was added again meanwhile", () => {
    expect(
      withSongAt([song("2026-09-21", "piano")], 0, song("2026-09-21", "piano")),
    ).toHaveLength(1);
  });
});

describe("songCacheName", () => {
  it("changes when the notes do", () => {
    expect(songCacheName(song("2026-09-28", "piano"))).not.toBe(
      songCacheName(song("2026-09-28", "piano", "G")),
    );
    expect(songCacheName(piece("abc", "piano"))).not.toBe(
      songCacheName(piece("abc", "piano", ["G"])),
    );
  });
});
