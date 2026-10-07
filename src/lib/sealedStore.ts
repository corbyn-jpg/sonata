import AsyncStorage from "@react-native-async-storage/async-storage";

// Encrypted records kept on the phone (playlists, thought records), sealed (AES-GCM) exactly as they're sent to Firestore. The same offline-first idea as check-ins (localCheckins.ts), with two differences: a record can be edited, so the newest version wins, and it can be deleted, so a deleted one is remembered until Firestore has deleted it too.

export type SealedRecord = {
  /** The Firestore document id, chosen on the phone. */
  id: string;
  encrypted_payload: string;
  initialization_vector_iv: string;
  /** When it last changed, in milliseconds since 1970. The newest version wins. */
  updated_at: number;
  /** Deleted on this phone, and waiting for Firestore to delete it too. */
  deleted: boolean;
  /** Whether Firestore has this version. */
  synced: boolean;
};

/** One record per id: the newest version wins (on a tie, a confirmed copy stays confirmed). */
export function mergeRecords(existing: readonly SealedRecord[], incoming: readonly SealedRecord[]) {
  const byId = new Map(existing.map((record) => [record.id, record]));
  for (const record of incoming) {
    const old = byId.get(record.id);
    if (!old || record.updated_at > old.updated_at) byId.set(record.id, record);
    else if (record.updated_at === old.updated_at && record.synced) byId.set(record.id, { ...old, synced: true });
  }
  return [...byId.values()];
}

/** Firestore has these versions: mark them confirmed, and forget deleted ones for good. A record edited again since stays pending. */
export function confirmRecords(
  records: readonly SealedRecord[],
  sent: readonly Pick<SealedRecord, "id" | "updated_at">[],
) {
  return records.flatMap((record) => {
    if (!sent.some((s) => s.id === record.id && s.updated_at === record.updated_at)) return [record];
    return record.deleted ? [] : [{ ...record, synced: true }];
  });
}

/** The records stored on the phone under `storageKey`. Read from storage once, then kept in memory. */
export function localStore(storageKey: string) {
  let records: Promise<SealedRecord[]> | null = null;
  // Writes run one after another, so two saves can't overwrite each other
  let writing: Promise<unknown> = Promise.resolve();

  const all = (): Promise<SealedRecord[]> => {
    records ??= AsyncStorage.getItem(storageKey)
      .then((saved) => (saved ? (JSON.parse(saved) as SealedRecord[]) : []))
      .catch(() => []);
    return records;
  };

  const update = (change: (current: SealedRecord[]) => SealedRecord[]) => {
    const next = writing.then(async () => {
      const updated = change(await all());
      records = Promise.resolve(updated);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    });
    writing = next.catch(() => {});
    return next;
  };

  return {
    all,
    /** Add or update records (by id). */
    store: (incoming: readonly SealedRecord[]) => update((current) => mergeRecords(current, incoming)),
    /** Note that Firestore has these versions. */
    markSynced: (sent: readonly Pick<SealedRecord, "id" | "updated_at">[]) =>
      update((current) => confirmRecords(current, sent)),
  };
}
