import { addDoc, collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { emotionOf, pitchOf, valenceOf, type Emotion, type Letter, type Mode, type Pitch } from '@/data/notes';
import { decryptPayload, encryptPayload } from '@/lib/crypto';
import { db } from '@/lib/firebase';
import { getUserId } from '@/lib/session';

/** Everything here is encrypted; only valence_score and timestamp are stored in plaintext. */
type Payload = { note: Letter; pitch: Pitch; mode: Mode; emotion: Emotion; reflection?: string };

export type Checkin = Payload & { id: string; valence: number; timestamp: Date };

const checkins = collection(db, 'daily_checkins');

export async function saveCheckin(note: Letter, mode: Mode, reflection?: string) {
  const payload: Payload = { note, pitch: pitchOf(note, mode), mode, emotion: emotionOf(note, mode) };
  const text = reflection?.trim();
  if (text) payload.reflection = text;

  const [user_id, sealed] = await Promise.all([getUserId(), encryptPayload(payload)]);
  return addDoc(checkins, {
    user_id,
    ...sealed,
    valence_score: valenceOf(note, mode),
    timestamp: Timestamp.now(),
  });
}

/** Check-ins from `from` (inclusive) to `to` (exclusive), oldest first. */
export async function getCheckins(from: Date, to: Date): Promise<Checkin[]> {
  const user_id = await getUserId();
  const snapshot = await getDocs(
    query(
      checkins,
      where('user_id', '==', user_id),
      where('timestamp', '>=', Timestamp.fromDate(from)),
      where('timestamp', '<', Timestamp.fromDate(to)),
      orderBy('timestamp'),
    ),
  );

  return Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const payload = await decryptPayload<Payload>({
        encrypted_payload: data.encrypted_payload,
        initialization_vector_iv: data.initialization_vector_iv,
      });
      return { ...payload, id: doc.id, valence: data.valence_score, timestamp: data.timestamp.toDate() };
    }),
  );
}

/** When each check-in since `from` happened, oldest first. Timestamps only */
export async function getCheckinDates(from: Date): Promise<Date[]> {
  const user_id = await getUserId();
  const snapshot = await getDocs(
    query(
      checkins,
      where('user_id', '==', user_id),
      where('timestamp', '>=', Timestamp.fromDate(from)),
      orderBy('timestamp'), // ascending uses the index you already have
    ),
  );
  return snapshot.docs.map((doc) => doc.data().timestamp.toDate());
}