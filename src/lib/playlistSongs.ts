import type { Instrument } from "@/audio/instruments";
import type { Playable } from "@/audio/mixer";
import type { Letter, Mode } from "@/data/notes";
import {
  composePiece,
  composeWeek,
  paletteOf,
  type DayNote,
  type Piece,
} from "@/engine";
import { hashString } from "@/engine/random";

/** A week's song as it was when it was added. The notes are kept, so it always sounds the same. */
export type PlaylistWeek = {
  kind: "week";
  /** The week's Monday, as a day key (e.g. "2026-09-28"). */
  week: string;
  instrument: Instrument;
  /** Monday to Sunday; null for a day without a check-in. */
  days: ({ note: Letter; mode: Mode } | null)[];
};

/** A Composer piece as it was when it was added (editing the piece later doesn't change this copy until it's added again). */
export type PlaylistPiece = {
  kind: "piece";
  /** The saved piece's id. */
  id: string;
  name: string;
  instrument: Instrument;
  piece: Piece;
};

export type PlaylistSong = PlaylistWeek | PlaylistPiece; // monthly songs may join later

const songId = (song: PlaylistSong) =>
  song.kind === "week" ? `week-${song.week}` : `piece-${song.id}`;

/** The same week, or the same piece, on the same instrument: adding it again updates it rather than adding a copy. */
export const sameSong = (a: PlaylistSong, b: PlaylistSong) =>
  songId(a) === songId(b) && a.instrument === b.instrument;

/** A key that's unique within a playlist. */
export const songKey = (song: PlaylistSong) =>
  `${songId(song)}-${song.instrument}`;

/** The songs with `song` added at the end, or, if it's already there, updated where it is (the week has had more check-ins, or the piece has been edited). */
export function withSong(
  songs: readonly PlaylistSong[],
  song: PlaylistSong,
): PlaylistSong[] {
  const i = songs.findIndex((s) => sameSong(s, song));
  return i < 0 ? [...songs, song] : songs.map((s, j) => (j === i ? song : s));
}

/** The songs with `song` put back at `index` (an undone remove). If it was added again in the meantime, nothing changes. */
export function withSongAt(
  songs: readonly PlaylistSong[],
  index: number,
  song: PlaylistSong,
): PlaylistSong[] {
  if (songs.some((s) => sameSong(s, song))) return [...songs];
  return [...songs.slice(0, index), song, ...songs.slice(index)];
}

/** The song, composed again from its saved notes: the same notes always make the same song. */
export const playableOf = (song: PlaylistSong): Playable =>
  song.kind === "week"
    ? composeWeek(song.days, song.week)
    : composePiece(song.piece);

/** The song's two main colours, for its little record. */
export const songPalette = (song: PlaylistSong): [DayNote, DayNote] =>
  paletteOf(
    song.kind === "week"
      ? song.days
      : song.piece.steps.map((note) => note && { note, mode: song.piece.mode }),
  );

/** The name the song's audio is cached under, shared with the Weekly tab and the Composer, so a song already played there starts straight away. */
export const songCacheName = (song: PlaylistSong) =>
  song.kind === "week"
    ? `song-${song.week}-${hashString(JSON.stringify(song.days)).toString(36)}`
    : `piece-${hashString(JSON.stringify(song.piece)).toString(36)}`;
