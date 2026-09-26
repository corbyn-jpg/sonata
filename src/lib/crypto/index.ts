import { getRandomBytes } from 'expo-crypto';
import { IV_BYTES, open, seal, type Sealed } from './aes';
import { getKey } from './key';

export type { Sealed };

export async function encryptPayload(data: object): Promise<Sealed> {
  return seal(data, await getKey(), getRandomBytes(IV_BYTES)); // fresh IV per record
}

export async function decryptPayload<T>(sealed: Sealed): Promise<T> {
  return open<T>(sealed, await getKey());
}