import AsyncStorage from "@react-native-async-storage/async-storage";

// Check-ins kept on the phone, so the app works with no connection. These are the same sealed (AES-GCM encrypted) records that go to Firestore: nothing readable is stored here either.

export type StoredCheckin = {
  /** The Firestore document id, chosen on the phone so a record keeps one id everywhere. */
  id: string;
  encrypted_payload: string;
  initialization_vector_iv: string;
  valence_score: number;
  /** Milliseconds since 1970. */
  timestamp: number;
  /** Whether Firestore has confirmed it has this record. */
  synced: boolean;
};

const STORAGE_KEY = "sonata.checkins.v1";

/** Records from both lists, one per id (a confirmed copy stays confirmed), oldest first. */
export function mergeCheckins(
  existing: readonly StoredCheckin[],
  incoming: readonly StoredCheckin[],
) {
  const byId = new Map(existing.map((record) => [record.id, record]));
  for (const record of incoming) {
    const old = byId.get(record.id);
    byId.set(record.id, {
      ...record,
      synced: record.synced || (old?.synced ?? false),
    });
  }
  return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp);
}

let records: Promise<StoredCheckin[]> | null = null;
// Writes run one after another, so two saves can't overwrite each other
let writing: Promise<unknown> = Promise.resolve();

/** Every check-in on this phone, oldest first. Read from storage once, then kept in memory. */
export function localCheckins(): Promise<StoredCheckin[]> {
  records ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((saved) => (saved ? (JSON.parse(saved) as StoredCheckin[]) : []))
    .catch(() => []);
  return records;
}

function update(change: (current: StoredCheckin[]) => StoredCheckin[]) {
  const next = writing.then(async () => {
    const updated = change(await localCheckins());
    records = Promise.resolve(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  });
  writing = next.catch(() => {});
  return next;
}

/** Add or update records (by id). */
export const storeCheckins = (incoming: readonly StoredCheckin[]) =>
  update((current) => mergeCheckins(current, incoming));

/** Note that Firestore has confirmed these records. */
export const markSynced = (ids: readonly string[]) =>
  update((current) =>
    current.map((record) =>
      ids.includes(record.id) ? { ...record, synced: true } : record,
    ),
  );
