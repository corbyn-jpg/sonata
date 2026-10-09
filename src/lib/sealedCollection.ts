import { useEffect, useState, useSyncExternalStore } from "react";
import {
  collection,
  deleteDoc,
  doc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { decryptPayload, encryptPayload } from "@/lib/crypto";
import { db } from "@/lib/firebase";
import { localStore, type SealedRecord } from "@/lib/sealedStore";
import { getUserId } from "@/lib/session";
import { withTimeout } from "@/lib/timeout";

// A Firestore collection of the user's own encrypted records (playlists, thought records) that works offline: every change is sealed and saved on the phone first, then uploaded in the background. Firestore only ever sees who owns a record and when it last changed.
// Nothing is imported back from Firestore: the key never leaves this phone, so a server copy couldn't be read anywhere else anyway.

/** A record as the app sees it: its content, decrypted, plus its id and when it last changed. */
export type Opened<Content> = Content & { id: string; updatedAt: number };

export function sealedCollection<Content extends object>(name: string) {
  const firestore = collection(db, name);
  const local = localStore(`sonata.${name}.v1`);

  // Screens showing these records read them again whenever one changes
  let version = 0;
  const listeners = new Set<() => void>();
  const changed = () => {
    version++;
    listeners.forEach((listener) => listener());
  };

  // Changes run one after another, so two quick taps can't each change the same old copy
  let queue: Promise<unknown> = Promise.resolve();
  const queued = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task);
    queue = next.catch(() => {});
    return next;
  };

  let uploading: Promise<void> | null = null;

  /** Send Firestore every change it hasn't confirmed yet. Safe to call often. */
  const uploadPending = (): Promise<void> => {
    uploading ??= (async () => {
      const pending = (await local.all()).filter((record) => !record.synced);
      if (pending.length === 0) return;
      const user_id = await getUserId();
      const sent: Pick<SealedRecord, "id" | "updated_at">[] = [];
      await Promise.all(
        pending.map(async (record) => {
          const ref = doc(firestore, record.id);
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
      if (sent.length > 0) await local.markSynced(sent);
    })()
      .catch(() => {}) // not signed in yet: everything stays pending
      .finally(() => {
        uploading = null;
      });
    return uploading;
  };

  /** Seal and store a new version (`content` null = deleted), then upload it in the background. */
  const save = async (id: string, content: Content | null, previous = 0) => {
    const sealed = content
      ? await encryptPayload(content)
      : { encrypted_payload: "", initialization_vector_iv: "" };
    await local.store([
      {
        id,
        ...sealed,
        updated_at: Math.max(Date.now(), previous + 1), // always newer than the version it replaces
        deleted: content === null,
        synced: false,
      },
    ]);
    changed();
    void uploadPending();
  };

  /** Every record on this phone, most recently changed first. */
  const getAll = async (): Promise<Opened<Content>[]> => {
    void uploadPending();
    const records = (await local.all()).filter((record) => !record.deleted);
    const opened: Opened<Content>[] = [];
    await Promise.all(
      records.map(async (record) => {
        try {
          opened.push({
            ...(await decryptPayload<Content>(record)),
            id: record.id,
            updatedAt: record.updated_at,
          });
        } catch {
          console.warn(
            `Skipped ${name} record ${record.id}: it can't be decrypted on this device`,
          ); // never log its contents
        }
      }),
    );
    return opened.sort((a, b) => b.updatedAt - a.updatedAt);
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    /** A new record. Returns its id (made on the phone, no connection needed). */
    create: (content: Content) =>
      queued(async () => {
        const id = doc(firestore).id;
        await save(id, content);
        return id;
      }),

    /** Change a record's content. */
    edit: (id: string, change: (content: Content) => Content) =>
      queued(async () => {
        const record = (await local.all()).find(
          (r) => r.id === id && !r.deleted,
        );
        if (!record) throw new Error(`That ${name} record no longer exists`);
        await save(
          id,
          change(await decryptPayload<Content>(record)),
          record.updated_at,
        );
      }),

    remove: (id: string) =>
      queued(async () => {
        const record = (await local.all()).find((r) => r.id === id);
        if (record && !record.deleted) await save(id, null, record.updated_at);
      }),

    /**
     Records from a backup file, sealed with this phone's key under new ids. Each keeps when it last changed; one
     already here from that same moment is skipped, so restoring twice adds nothing. Returns how many were added.
     */
    restore: (backup: readonly { content: Content; updatedAt: number }[]) =>
      queued(async () => {
        const here = new Set((await local.all()).map((r) => r.updated_at));
        const fresh = backup.filter((r) => !here.has(r.updatedAt));
        const records = await Promise.all(
          fresh.map(async ({ content, updatedAt }) => ({
            id: doc(firestore).id,
            ...(await encryptPayload(content)),
            updated_at: updatedAt,
            deleted: false,
            synced: false,
          })),
        );
        await local.store(records);
        changed();
        void uploadPending();
        return records.length;
      }),

    uploadPending,
    getAll,

    /** Every record, kept up to date on any screen after any change. Null until first loaded. */
    useAll: function useAll(): Opened<Content>[] | null {
      const current = useSyncExternalStore(subscribe, () => version);
      const [loaded, setLoaded] = useState<Opened<Content>[] | null>(null);
      useEffect(() => {
        let cancelled = false;
        getAll()
          .then((list) => !cancelled && setLoaded(list))
          .catch(() => !cancelled && setLoaded([]));
        return () => {
          cancelled = true;
        };
      }, [current]);
      return loaded;
    },
  };
}
