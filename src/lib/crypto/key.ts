import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { bytesToHex, hexToBytes } from '@noble/ciphers/utils.js';
import { KEY_BYTES } from './aes';

const STORE_KEY = 'sonata.payloadKey';

let pending: Promise<Uint8Array> | null = null;

async function loadOrCreate() {
  const stored = await SecureStore.getItemAsync(STORE_KEY);
  if (stored) return hexToBytes(stored);

  const key = getRandomBytes(KEY_BYTES);
  await SecureStore.setItemAsync(STORE_KEY, bytesToHex(key), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
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