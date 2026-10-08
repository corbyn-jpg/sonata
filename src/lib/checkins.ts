import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
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
import {
  localCheckins,
  markSynced,
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

export async function saveCheckin(
  note: Letter,
  mode: Mode,
  instrument: Instrument,
  reflection?: string,
) {
  const payload: Payload = {
    note,
    pitch: pitchOf(note, mode),
    mode,
    emotion: emotionOf(note, mode),
    instrument,
  };
  const text = reflection?.trim();
  if (text) payload.reflection = text;

  const sealed = await encryptPayload(payload);
  await storeCheckins([
    {
      id: doc(checkins).id, // generated on the phone, no connection needed
      ...sealed,
      valence_score: valenceOf(note, mode),
      timestamp: Date.now(),
      synced: false,
    },
  ]);
  void uploadPending(); // in the background; if offline it tries again next time
}

let uploading: Promise<void> | null = null;

/** Send any check-ins Firestore hasn't confirmed yet. Safe to call often. */
export function uploadPending(): Promise<void> {
  uploading ??= (async () => {
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
        // Saved with a key this phone no longer has (e.g. after a reinstall). Skip it rather than
        // losing the whole week; never log the payload itself.
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
