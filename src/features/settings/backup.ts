import { getRandomBytes } from "expo-crypto";
import { File } from "expo-file-system";
import Share from "react-native-share";
import { LETTERS } from "@/data/notes";
import type { ThoughtRecord } from "@/features/oasis/thoughts";
import { lockBackup, unlockBackup } from "@/lib/backupFile";
import {
  getCheckins,
  restoreCheckins,
  type CheckinEntry,
} from "@/lib/checkins";
import { addDays, dayKey } from "@/lib/dates";
import { shareFile } from "@/lib/pdf";
import type { PlaylistSong } from "@/lib/playlistSongs";
import { getPieces, restorePieces, type PieceContent } from "@/lib/pieces";
import { getPlaylists, restorePlaylists } from "@/lib/playlists";
import { getThoughtRecords, restoreThoughtRecords } from "@/lib/thoughtRecords";

// Back up to a file, and restore from one. Decrypted data only ever goes into the locked file, or back into this phone's sealed records: it's never logged or uploaded.

type Dated<T> = { content: T; updatedAt: number };

/** What's inside a backup once it's unlocked. No emotion words: they follow from note + mode when restored. */
type BackupContent = {
  checkins: CheckinEntry[];
  thoughtRecords: Dated<ThoughtRecord>[];
  playlists: Dated<{ name: string; songs: PlaylistSong[] }>[];
  /** Missing from backups made before the Composer could save. */
  pieces?: Dated<PieceContent>[];
};

export type Restored = {
  checkins: number;
  thoughtRecords: number;
  playlists: number;
  pieces: number;
};

/** Lock everything on this phone with `passphrase` and open the share sheet with the file. */
export async function makeBackup(
  passphrase: string,
  onProgress?: (done: number) => void,
) {
  const now = new Date();
  const [checkins, thoughts, playlists, pieces] = await Promise.all([
    getCheckins(new Date(0), addDays(now, 1)),
    getThoughtRecords(),
    getPlaylists(),
    getPieces(),
  ]);
  const content: BackupContent = {
    checkins: checkins.map(
      ({ note, mode, instrument, reflection, timestamp }) => ({
        note,
        mode,
        instrument,
        reflection,
        timestamp: timestamp.getTime(),
      }),
    ),
    thoughtRecords: thoughts.map(
      ({ situation, thought, pattern, balanced, updatedAt }) => ({
        content: { situation, thought, pattern, balanced },
        updatedAt,
      }),
    ),
    playlists: playlists.map(({ name, songs, updatedAt }) => ({
      content: { name, songs },
      updatedAt,
    })),
    pieces: pieces.map(({ name, instrument, piece, updatedAt }) => ({
      content: { name, instrument, piece },
      updatedAt,
    })),
  };

  const file = shareFile(`Sonata backup ${dayKey(now)}.json`);
  file.write(await lockBackup(content, passphrase, getRandomBytes, onProgress));
  await Share.open({
    url: file.uri,
    type: "application/json",
    title: "Save your backup",
    failOnCancel: false,
  });
}

/** Ask for a backup file with the system picker. Its text, or null if the user backs out. */
export async function pickBackup(): Promise<string | null> {
  const picked = await File.pickFileAsync(); // any type: cloud drives label .json files inconsistently
  return picked.canceled ? null : picked.result.text();
}

const isEntry = (entry: CheckinEntry) =>
  LETTERS.includes(entry.note) &&
  (entry.mode === "major" || entry.mode === "minor") &&
  Number.isFinite(entry.timestamp);

/** Unlock a backup and add what isn't on this phone yet. Nothing here is replaced. */
export async function restoreBackup(
  text: string,
  passphrase: string,
  onProgress?: (done: number) => void,
): Promise<Restored> {
  const backup = await unlockBackup<BackupContent>(
    text,
    passphrase,
    onProgress,
  );
  return {
    checkins: await restoreCheckins((backup.checkins ?? []).filter(isEntry)),
    thoughtRecords: await restoreThoughtRecords(backup.thoughtRecords ?? []),
    playlists: await restorePlaylists(backup.playlists ?? []),
    pieces: await restorePieces(backup.pieces ?? []),
  };
}
