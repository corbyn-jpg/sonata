import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocsFromServer,
  query,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import {
  emotionOf,
  pitchOf,
  valenceOf,
  type Emotion,
  type Letter,
  type Mode,
  type Pitch,
} from "@/data/notes";
import type { Instrument } from "@/audio/instruments";
import { decryptPayload, encryptPayload } from "@/lib/crypto";
import { db } from "@/lib/firebase";
import { addDays, startOfDay } from "@/lib/dates";
import {
  localCheckins,
  markSynced,
  removeCheckins,
  storeCheckins,
  type StoredCheckin,
} from "@/lib/localCheckins";
import { getUserId } from "@/lib/session";
import { withTimeout } from "@/lib/timeout";

// Offline-first: check-ins are saved on the phone and read from there, so the app works with no connection. Firestore is the backup: new check-ins are uploaded whenever there's a connection.

/** Everything here is encrypted; only valence_score and timestamp are stored in plaintext. */
type Payload = {
  note: Letter;
  pitch: Pitch;
  mode: Mode;
  emotion: Emotion;
  instrument?: Instrument;
  reflection?: string;
};

export type Checkin = Payload & {
  id: string;
  valence: number;
  timestamp: Date;
};

const checkins = collection(db, "daily_checkins");
const IMPORTED_KEY = "sonata.checkins.imported";
// Check-ins removed on this phone that the backup still holds; deleted from Firestore whenever there's a connection
const DELETED_KEY = "sonata.checkins.deleted";

async function deletedIds(): Promise<string[]> {
  const saved = await AsyncStorage.getItem(DELETED_KEY).catch(() => null);
  return saved ? (JSON.parse(saved) as string[]) : [];
}

/** Delete from Firestore what's been removed on the phone. Anything that fails (offline) is tried again next time. */
async function deletePending() {
  const ids = await deletedIds();
  if (ids.length === 0) return;
  const done: string[] = [];
  await Promise.all(
    ids.map(async (id) => {
      try {
        await withTimeout(deleteDoc(doc(checkins, id)));
        done.push(id);
      } catch {
        // Offline or not signed in yet: it stays queued
      }
    }),
  );
  // Read the list again, so a removal made meanwhile isn't lost
  const left = (await deletedIds()).filter((id) => !done.includes(id));
  await AsyncStorage.setItem(DELETED_KEY, JSON.stringify(left));
}

/** Remove records from the phone straight away, and from the backup as soon as there's a connection. */
async function forget(records: readonly StoredCheckin[]) {
  if (records.length === 0) return 0;
  // Only uploaded records need deleting from the backup (one that never reached it has nothing to delete there)
  const uploaded = records.filter((r) => r.synced).map((r) => r.id);
  if (uploaded.length > 0)
    await AsyncStorage.setItem(
      DELETED_KEY,
      JSON.stringify([...new Set([...(await deletedIds()), ...uploaded])]),
    );
  await removeCheckins(records.map((r) => r.id));
  void uploadPending(); // also sends the deletions
  return records.length;
}

/** Remove today's check-in, so the day can be chosen again. Returns how many records were removed (normally one). */
export async function forgetTodaysCheckin() {
  const from = startOfDay(new Date());
  const to = addDays(from, 1);
  return forget(
    (await localCheckins()).filter(
      (r) => r.timestamp >= from.getTime() && r.timestamp < to.getTime(),
    ),
  );
}

/** Remove the check-ins made at these moments (the sample months). Returns how many were removed. */
export async function forgetCheckinsAt(timestamps: readonly number[]) {
  const at = new Set(timestamps);
  return forget((await localCheckins()).filter((r) => at.has(r.timestamp)));
}

/** What the user chose for a check-in, and when. Everything else (pitch, emotion, valence) follows from note + mode. */
export type CheckinEntry = {
  note: Letter;
  mode: Mode;
  instrument?: Instrument;
  reflection?: string;
  /** Milliseconds since 1970. */
  timestamp: number;
};

async function sealCheckin({
  note,
  mode,
  instrument,
  reflection,
  timestamp,
}: CheckinEntry): Promise<StoredCheckin> {
  const payload: Payload = {
    note,
    pitch: pitchOf(note, mode),
    mode,
    emotion: emotionOf(note, mode),
  };
  if (instrument) payload.instrument = instrument;
  const text = reflection?.trim();
  if (text) payload.reflection = text;

  return {
    id: doc(checkins).id, // generated on the phone, no connection needed
    ...(await encryptPayload(payload)),
    valence_score: valenceOf(note, mode),
    timestamp,
    synced: false,
  };
}

export async function saveCheckin(
  note: Letter,
  mode: Mode,
  instrument: Instrument,
  reflection?: string,
) {
  await storeCheckins([
    await sealCheckin({
      note,
      mode,
      instrument,
      reflection,
      timestamp: Date.now(),
    }),
  ]);
  void uploadPending(); // in the background; if offline it tries again next time
}

/**
 Check-ins from a backup file, sealed with this phone's key under new ids (so they can't clash with the old account's documents). One already here from the same moment is skipped, so restoring twice adds nothing. Returns how many were added.
 */
export async function restoreCheckins(entries: readonly CheckinEntry[]) {
  const here = new Set((await allCheckins()).map((record) => record.timestamp));
  const fresh = entries.filter((entry) => !here.has(entry.timestamp));
  await storeCheckins(await Promise.all(fresh.map(sealCheckin)));
  void uploadPending();
  return fresh.length;
}

let uploading: Promise<void> | null = null;

/** Send any check-ins Firestore hasn't confirmed yet. Safe to call often. */
export function uploadPending(): Promise<void> {
  uploading ??= (async () => {
    await deletePending().catch(() => {});
    const pending = (await localCheckins()).filter((record) => !record.synced);
    if (pending.length === 0) return;
    const user_id = await getUserId();
    const sent: string[] = [];
    await Promise.all(
      pending.map(async (record) => {
        const ref = doc(checkins, record.id);
        try {
          await withTimeout(
            setDoc(ref, {
              user_id,
              encrypted_payload: record.encrypted_payload,
              initialization_vector_iv: record.initialization_vector_iv,
              valence_score: record.valence_score,
              timestamp: Timestamp.fromMillis(record.timestamp),
            }),
          );
          sent.push(record.id);
        } catch {
          // Refused because it's already there (an earlier upload got through)? Then it's done.
          if ((await getDoc(ref).catch(() => null))?.exists())
            sent.push(record.id);
        }
      }),
    );
    if (sent.length > 0) await markSynced(sent);
  })()
    .catch(() => {}) // offline or not signed in yet: the records stay pending
    .finally(() => {
      uploading = null;
    });
  return uploading;
}

/**
 Check-ins made before they were kept on the phone exist only in Firestore. Copy them over once; after that, everything is saved here first.
 */
async function importFromServer() {
  if ((await AsyncStorage.getItem(IMPORTED_KEY)) === "yes") return;
  const user_id = await withTimeout(getUserId());
  const snapshot = await withTimeout(
    getDocsFromServer(query(checkins, where("user_id", "==", user_id))),
  );
  await storeCheckins(
    snapshot.docs.map((d): StoredCheckin => {
      const data = d.data();
      return {
        id: d.id,
        encrypted_payload: data.encrypted_payload,
        initialization_vector_iv: data.initialization_vector_iv,
        valence_score: data.valence_score,
        timestamp: data.timestamp.toMillis(),
        synced: true,
      };
    }),
  );
  await AsyncStorage.setItem(IMPORTED_KEY, "yes");
}

/** All check-ins on the phone, after the one-time import (skipped if offline) and an upload try. */
async function allCheckins() {
  await importFromServer().catch(() => {}); // offline: show what's on the phone
  void uploadPending();
  return localCheckins();
}

/** Check-ins from `from` (inclusive) to `to` (exclusive), oldest first. */
export async function getCheckins(from: Date, to: Date): Promise<Checkin[]> {
  const inRange = (await allCheckins()).filter(
    (record) =>
      record.timestamp >= from.getTime() && record.timestamp < to.getTime(),
  );
  const results = await Promise.all(
    inRange.map(async (record): Promise<Checkin | null> => {
      try {
        const payload = await decryptPayload<Payload>(record);
        return {
          ...payload,
          id: record.id,
          valence: record.valence_score,
          timestamp: new Date(record.timestamp),
        };
      } catch {
        // Sealed with a key this phone no longer has (e.g. after a reinstall): skipped rather than losing the week. Never log the payload.
        console.warn(
          `Skipped check-in ${record.id}: it can't be decrypted on this device`,
        );
        return null;
      }
    }),
  );
  return results.filter((checkin): checkin is Checkin => checkin !== null);
}

/** When each check-in since `from` happened, oldest first. Timestamps only, nothing decrypted. */
export async function getCheckinDates(from: Date): Promise<Date[]> {
  return (await allCheckins())
    .filter((record) => record.timestamp >= from.getTime())
    .map((record) => new Date(record.timestamp));
}
