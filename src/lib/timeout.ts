const SERVER_TIMEOUT = 4000; // ms to wait for Firestore before carrying on without it

/** Give up on a Firestore call that's taking too long (usually: no connection). */
export function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Firestore timed out")), SERVER_TIMEOUT)),
  ]);
}