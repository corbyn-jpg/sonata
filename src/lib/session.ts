import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';

let pending: Promise<string> | null = null;

async function signIn() {
  await auth.authStateReady(); // let the persisted user load from AsyncStorage first
  return (auth.currentUser ?? (await signInAnonymously(auth)).user).uid;
}

/** Anonymous UID. Retries on the next call if sign-in failed (e.g. offline on first launch). */
export function getUserId() {
  pending ??= signIn().catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}