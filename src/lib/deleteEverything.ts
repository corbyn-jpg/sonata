// "Delete all data", in an order that can't leave the user half-deleted: the backup first, and only if that works, the account and then everything on the phone. Pure, so the order is tested; the real steps are in wipe.ts.

export type Wipe = {
  /** Delete the user's records from Firestore. Throws if the backup can't be reached. */
  deleteServerData: () => Promise<void>;
  /** Delete the anonymous account (best effort: a new one is made on the next launch either way). */
  deleteAccount: () => Promise<void>;
  /** Everything on the phone: stored records, preferences, the encryption key, cached songs and files, the reminder. */
  wipePhone: () => Promise<void>;
  /** Start the app again, fresh. */
  restart: () => Promise<void>;
};

/** The backup couldn't be reached, so nothing was deleted. */
export class BackupUnreachable extends Error {}

/** The word the user types to confirm. */
export const CONFIRM_WORD = "delete";
export const isConfirmed = (typed: string) =>
  typed.trim().toLowerCase() === CONFIRM_WORD;

export async function deleteEverything(steps: Wipe) {
  try {
    await steps.deleteServerData();
  } catch {
    throw new BackupUnreachable(
      "The backup couldn't be reached, so nothing was deleted",
    );
  }
  await steps.deleteAccount().catch(() => {});
  await steps.wipePhone();
  await steps.restart();
}
