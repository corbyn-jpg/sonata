import { cleanRecord, type ThoughtRecord } from "@/features/oasis/thoughts";
import { sealedCollection, type Opened } from "@/lib/sealedCollection";

// Thought records, offline-first and encrypted like everything else the user writes (CBT_THOUGHT_RECORDS in the ERD). Only who owns a record and when it was saved are visible to Firestore.

export type SavedThoughtRecord = Opened<ThoughtRecord>;

const records = sealedCollection<ThoughtRecord>("cbt_thought_records");

export const saveThoughtRecord = (record: ThoughtRecord) =>
  records.create(cleanRecord(record));
export const deleteThoughtRecord = records.remove;

/** Every thought record, newest first, kept up to date on any screen. Null until first loaded. */
export const useThoughtRecords = records.useAll;

/** Every thought record on this phone, newest first (for Export my data and backups). */
export const getThoughtRecords = records.getAll;

/** Thought records from a backup file (skips any already here). Returns how many were added. */
export const restoreThoughtRecords = (
  backup: readonly { content: ThoughtRecord; updatedAt: number }[],
) =>
  records.restore(
    backup.map(({ content, updatedAt }) => ({
      content: cleanRecord(content),
      updatedAt,
    })),
  );
