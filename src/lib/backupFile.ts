import { scryptAsync } from "@noble/hashes/scrypt.js";
import { bytesToHex, hexToBytes } from "@noble/ciphers/utils.js";
import { IV_BYTES, KEY_BYTES, open, seal, type Sealed } from "@/lib/crypto/aes";

// A backup file: everything the user has written, locked with a key made from a passphrase they choose. The phone's own key never leaves the phone, so this file is the only way to bring the data back after losing the phone or reinstalling.

const APP = "Sonata backup";
const SALT_BYTES = 16;
export const MIN_PASSPHRASE = 8;

type Cost = { N: number; r: number; p: number };

/**
 scrypt's cost: 8 MB of memory and a few seconds on a phone (Hermes has no JIT), so every guess at the passphrase is slow too. It's written into each file, so it can be raised later without breaking older backups.
 */
export const COST: Cost = { N: 2 ** 13, r: 8, p: 1 };

type BackupFile = Sealed & {
  app: typeof APP;
  version: 1;
  scrypt: Cost & { salt: string };
};

export class NotABackup extends Error {}
export class WrongPassphrase extends Error {}

// NFKC: the same passphrase typed on another keyboard (é as one character or two) gives the same key
const keyFrom = (
  passphrase: string,
  salt: Uint8Array,
  { N, r, p }: Cost,
  onProgress?: (done: number) => void,
) =>
  scryptAsync(passphrase.normalize("NFKC"), salt, {
    N,
    r,
    p,
    dkLen: KEY_BYTES,
    asyncTick: 25, // hands the thread back every 25 ms, so the spinner keeps turning
    onProgress,
  });

/** Lock `content` with `passphrase`; returns the file's text. */
export async function lockBackup(
  content: object,
  passphrase: string,
  random: (bytes: number) => Uint8Array,
  onProgress?: (done: number) => void,
  cost: Cost = COST,
): Promise<string> {
  const salt = random(SALT_BYTES);
  const key = await keyFrom(passphrase, salt, cost, onProgress);
  const file: BackupFile = {
    app: APP,
    version: 1,
    scrypt: { ...cost, salt: bytesToHex(salt) },
    ...seal(content, key, random(IV_BYTES)),
  };
  return JSON.stringify(file);
}

const isPowerOfTwo = (n: unknown) =>
  typeof n === "number" && Number.isInteger(n) && n > 1 && (n & (n - 1)) === 0;

function parse(text: string): BackupFile {
  let file: Partial<BackupFile> | null;
  try {
    file = JSON.parse(text) as Partial<BackupFile> | null;
  } catch {
    throw new NotABackup();
  }
  const cost = file?.scrypt;
  const shaped =
    file?.app === APP &&
    file.version === 1 &&
    typeof file.encrypted_payload === "string" &&
    typeof file.initialization_vector_iv === "string" &&
    typeof cost?.salt === "string" &&
    // A sensible cost only, so a doctored file can't make the phone run out of memory
    isPowerOfTwo(cost.N) &&
    cost.N <= 2 ** 17 &&
    cost.r === 8 &&
    cost.p === 1;
  if (!shaped) throw new NotABackup();
  return file as BackupFile;
}

/** Whether `text` looks like a Sonata backup (checked before asking for the passphrase). */
export function isBackup(text: string) {
  try {
    parse(text);
    return true;
  } catch {
    return false;
  }
}

/** Open a backup file's text. Throws NotABackup, or WrongPassphrase (GCM can't tell a wrong passphrase from a damaged file). */
export async function unlockBackup<T>(
  text: string,
  passphrase: string,
  onProgress?: (done: number) => void,
): Promise<T> {
  const file = parse(text);
  const { salt, ...cost } = file.scrypt;
  let key: Uint8Array;
  try {
    key = await keyFrom(passphrase, hexToBytes(salt), cost, onProgress);
  } catch {
    throw new NotABackup(); // the salt isn't valid hex
  }
  try {
    return open<T>(file, key);
  } catch {
    throw new WrongPassphrase();
  }
}
