import { sealedCollection, type Opened } from "@/lib/sealedCollection";
import { withSong, withSongAt, type PlaylistSong } from "@/lib/playlistSongs";

// Playlists of the user's own songs, offline-first and encrypted (sealedCollection.ts). The name and the songs are user content (the notes say how each day felt), so the whole playlist is sealed.

type Content = { name: string; songs: PlaylistSong[] };
export type Playlist = Opened<Content>;

export const MAX_NAME_LENGTH = 40;
const playlists = sealedCollection<Content>("playlists");

const cleanName = (name: string) => name.trim().slice(0, MAX_NAME_LENGTH) || "My playlist";

/** A new playlist, optionally starting with a song. Returns its id. */
export const createPlaylist = (name: string, firstSong?: PlaylistSong) =>
  playlists.create({ name: cleanName(name), songs: firstSong ? [firstSong] : [] });

export const renamePlaylist = (id: string, name: string) => playlists.edit(id, (c) => ({ ...c, name: cleanName(name) }));

/** Add a song (or update it, if that week on that instrument is already in the playlist). */
export const addSong = (id: string, song: PlaylistSong) => playlists.edit(id, (c) => ({ ...c, songs: withSong(c.songs, song) }));

export const removeSong = (id: string, index: number) =>
  playlists.edit(id, (c) => ({ ...c, songs: c.songs.filter((_, i) => i !== index) }));

/** Undo a remove: the song goes back where it was. */
export const restoreSong = (id: string, index: number, song: PlaylistSong) =>
  playlists.edit(id, (c) => ({ ...c, songs: withSongAt(c.songs, index, song) }));

export const deletePlaylist = playlists.remove;
export const uploadPendingPlaylists = playlists.uploadPending;
export const getPlaylists = playlists.getAll;

/** Every playlist, most recently changed first, kept up to date on any screen. Null until first loaded. */
export const usePlaylists = playlists.useAll;
