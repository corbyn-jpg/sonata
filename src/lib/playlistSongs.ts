import type { Instrument } from "@/audio/instruments";
import type { Letter, Mode } from "@/data/notes";
import { hashString } from "@/engine/random";

/** A week's song as it was when it was added. The notes are kept, so it always sounds the same. */
export type PlaylistSong = {
  kind: "week"; // monthly songs and Composer pieces join later
  /** The week's Monday, as a day key (e.g. "2026-09-28"). */
  week: string;
  instrument: Instrument;
  /** Monday to Sunday; null for a day without a check-in. */
  days: ({ note: Letter; mode: Mode } | null)[];
};

/** The songs with `song` added at the end, or, if that week on that instrument is already there, updated where it is (the week has had more check-ins since). */
export function withSong(songs: readonly PlaylistSong[], song: PlaylistSong): PlaylistSong[] {
  const i = songs.findIndex((s) => s.kind === song.kind && s.week === song.week && s.instrument === song.instrument);
  return i < 0 ? [...songs, song] : songs.map((s, j) => (j === i ? song : s));
}

/** The songs with `song` put back at `index` (an undone remove). If it was added again in the meantime, nothing changes. */
export function withSongAt(songs: readonly PlaylistSong[], index: number, song: PlaylistSong): PlaylistSong[] {
  if (songs.some((s) => s.kind === song.kind && s.week === song.week && s.instrument === song.instrument)) return [...songs];
  return [...songs.slice(0, index), song, ...songs.slice(index)];
}

/** The name the Weekly tab caches this song's audio under, so a song already played there starts straight away. */
export const songCacheName = (song: PlaylistSong) =>
  `song-${song.week}-${hashString(JSON.stringify(song.days)).toString(36)}`;