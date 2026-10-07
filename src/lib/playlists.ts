import { useEffect, useState, useSyncExternalStore } from "react";
import { collection, deleteDoc, doc, setDoc, Timestamp } from "firebase/firestore";
import { decryptPayload, encryptPayload } from "@/lib/crypto";
import { db } from "@/lib/firebase";
import { localPlaylists, markPlaylistsSynced, storePlaylists, type StoredPlaylist } from "@/lib/localPlaylists";
import { withSong, withSongAt, type PlaylistSong } from "@/lib/playlistSongs";
import { getUserId } from "@/lib/session";
import { withTimeout } from "@/lib/timeout";

// Playlists of the user's own songs. Offline-first like check-ins: kept on the phone, uploaded in the background. The name and the songs are user content (the notes say how each day felt), so the whole playlist is encrypted: Firestore only sees who owns it and when it last changed.
// Unlike check-ins there's nothing to import from Firestore: playlists are newer than offline-first, and the key never leaves this phone, so a server copy couldn't be read anywhere else anyway.

type Content = { name: string; songs: PlaylistSong[] };
export type Playlist = Content & { id: string; updatedAt: number };

export const MAX_NAME_LENGTH = 40;
const playlists = collection(db, "playlists");

// Screens showing playlists read them again whenever one changes
let version = 0;
const listeners = new Set<() => void>();
function changed() {
  version++;
  listeners.forEach((listener) => listener());
}

// Edits run one after another, so two quick taps can't each change the same old copy
let editing: Promise<unknown> = Promise.resolve();
function queued<T>(task: () => Promise<T>): Promise<T> {
  const next = editing.then(task);
  editing = next.catch(() => {});
  return next;
}

const cleanName = (name: string) => name.trim().slice(0, MAX_NAME_LENGTH) || "My playlist";

/** Seal and store a new version (`content` null = deleted), then upload it in the background. */
async function save(id: string, content: Content | null, previous = 0) {
  const sealed = content ? await encryptPayload(content) : { encrypted_payload: "", initialization_vector_iv: "" };
  await storePlaylists([
    {
      id,
      ...sealed,
      updated_at: Math.max(Date.now(), previous + 1), // always newer than the version it replaces
      deleted: content === null,
      synced: false,
    },
  ]);
  changed();
  void uploadPendingPlaylists();
}

const edit = (id: string, change: (content: Content) => Content) =>
  queued(async () => {
    const record = (await localPlaylists()).find((r) => r.id === id && !r.deleted);
    if (!record) throw new Error("That playlist no longer exists");
    await save(id, change(await decryptPayload<Content>(record)), record.updated_at);
  });

/** A new playlist, optionally starting with a song. Returns its id. */
export const createPlaylist = (name: string, firstSong?: PlaylistSong) =>
  queued(async () => {
    const id = doc(playlists).id; // made on the phone, no connection needed
    await save(id, { name: cleanName(name), songs: firstSong ? [firstSong] : [] });
    return id;
  });

export const renamePlaylist = (id: string, name: string) => edit(id, (c) => ({ ...c, name: cleanName(name) }));

/** Add a song (or update it, if that week on that instrument is already in the playlist). */
export const addSong = (id: string, song: PlaylistSong) => edit(id, (c) => ({ ...c, songs: withSong(c.songs, song) }));

export const removeSong = (id: string, index: number) =>
  edit(id, (c) => ({ ...c, songs: c.songs.filter((_, i) => i !== index) }));

/** Undo a remove: the song goes back where it was. */
export const restoreSong = (id: string, index: number, song: PlaylistSong) =>
  edit(id, (c) => ({ ...c, songs: withSongAt(c.songs, index, song) }));

export const deletePlaylist = (id: string) =>
  queued(async () => {
    const record = (await localPlaylists()).find((r) => r.id === id);
    if (record && !record.deleted) await save(id, null, record.updated_at);
  });

let uploading: Promise<void> | null = null;

/** Send Firestore every change it hasn't confirmed yet. Safe to call often. */
export function uploadPendingPlaylists(): Promise<void> {
  uploading ??= (async () => {
    const pending = (await localPlaylists()).filter((record) => !record.synced);
    if (pending.length === 0) return;
    const user_id = await getUserId();
    const sent: Pick<StoredPlaylist, "id" | "updated_at">[] = [];
    await Promise.all(
      pending.map(async (record) => {
        const ref = doc(playlists, record.id);
        try {
          await withTimeout(
            record.deleted
              ? deleteDoc(ref)
              : setDoc(ref, {
                  user_id,
                  encrypted_payload: record.encrypted_payload,
                  initialization_vector_iv: record.initialization_vector_iv,
                  updated_at: Timestamp.fromMillis(record.updated_at),
                }),
          );
          sent.push({ id: record.id, updated_at: record.updated_at });
        } catch {
          // Offline: it stays pending and goes next time
        }
      }),
    );
    if (sent.length > 0) await markPlaylistsSynced(sent);
  })()
    .catch(() => {}) // not signed in yet: everything stays pending
    .finally(() => {
      uploading = null;
    });
  return uploading;
}

/** Every playlist on this phone, most recently changed first. */
export async function getPlaylists(): Promise<Playlist[]> {
  void uploadPendingPlaylists();
  const records = (await localPlaylists()).filter((record) => !record.deleted);
  const opened = await Promise.all(
    records.map(async (record): Promise<Playlist | null> => {
      try {
        return { ...(await decryptPayload<Content>(record)), id: record.id, updatedAt: record.updated_at };
      } catch {
        console.warn(`Skipped playlist ${record.id}: it can't be decrypted on this device`); // never log its contents
        return null;
      }
    }),
  );
  return opened
    .filter((playlist): playlist is Playlist => playlist !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Every playlist, kept up to date on any screen after any change. Null until first loaded. */
export function usePlaylists(): Playlist[] | null {
  const current = useSyncExternalStore(subscribe, () => version);
  const [loaded, setLoaded] = useState<Playlist[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    getPlaylists()
      .then((list) => !cancelled && setLoaded(list))
      .catch(() => !cancelled && setLoaded([]));
    return () => {
      cancelled = true;
    };
  }, [current]);
  return loaded;
}