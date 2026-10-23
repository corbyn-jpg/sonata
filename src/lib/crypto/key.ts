import { getRandomBytes } from "expo-crypto";
import { bytesToHex, hexToBytes } from "@noble/ciphers/utils.js";
import { KEY_BYTES } from "./aes";
import { deleteKey, readKey, writeKey } from "./keyStore";

const STORE_KEY = "sonata.payloadKey";

let pending: Promise<Uint8Array> | null = null;

async function loadOrCreate() {
  const stored = await readKey(STORE_KEY);
  if (stored) return hexToBytes(stored);

  const key = getRandomBytes(KEY_BYTES);
  await writeKey(STORE_KEY, bytesToHex(key));
  return key;
}

/** Cache the promise, not the key, so two early callers can't each create a key. */
export function getKey() {
  pending ??= loadOrCreate().catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}

/** Forget the key, on this phone and in memory (for Delete all data). A new one is made the next time it's needed. */
export async function forgetKey() {
  pending = null;
  await deleteKey(STORE_KEY);
}
