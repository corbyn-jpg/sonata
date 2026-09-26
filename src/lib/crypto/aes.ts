import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, hexToBytes } from '@noble/ciphers/utils.js';

export const KEY_BYTES = 32; // AES-256
export const IV_BYTES = 12; // GCM standard nonce

/** Field names match the Firestore documents. */
export type Sealed = {
  encrypted_payload: string; // hex: ciphertext + 16-byte auth tag
  initialization_vector_iv: string; // hex
};

// UTF-8 via encodeURIComponent so we don't depend on TextDecoder in Hermes
const toBytes = (text: string) => Uint8Array.from(encodeURIComponent(text), (ch) => ch.charCodeAt(0));
const fromBytes = (bytes: Uint8Array) => decodeURIComponent(String.fromCharCode(...bytes));

export function seal(data: object, key: Uint8Array, iv: Uint8Array): Sealed {
  if (key.length !== KEY_BYTES) throw new Error(`Key must be ${KEY_BYTES} bytes`);
  if (iv.length !== IV_BYTES) throw new Error(`IV must be ${IV_BYTES} bytes`);
  const ciphertext = gcm(key, iv).encrypt(toBytes(JSON.stringify(data)));
  return { encrypted_payload: bytesToHex(ciphertext), initialization_vector_iv: bytesToHex(iv) };
}

/** Throws if the key is wrong or the record has been tampered with. */
export function open<T>(sealed: Sealed, key: Uint8Array): T {
  const iv = hexToBytes(sealed.initialization_vector_iv);
  const plaintext = gcm(key, iv).decrypt(hexToBytes(sealed.encrypted_payload));
  return JSON.parse(fromBytes(plaintext)) as T;
}