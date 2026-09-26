import { IV_BYTES, KEY_BYTES, open, seal } from './aes';

const bytes = (length: number, fill: number) => new Uint8Array(length).fill(fill);
const flipLastHex = (hex: string) => hex.slice(0, -1) + (hex.endsWith('0') ? '1' : '0');

const key = bytes(KEY_BYTES, 1);
const iv = bytes(IV_BYTES, 2);
const payload = { pitch: 'Eb', mode: 'minor', reflection: 'Long day — café ☕ 🎵' };

describe('seal / open', () => {
  it('round-trips a payload, including non-ASCII text', () => {
    expect(open(seal(payload, key, iv), key)).toEqual(payload);
  });

  it('gives different ciphertext for the same payload under a different IV', () => {
    const a = seal(payload, key, iv);
    const b = seal(payload, key, bytes(IV_BYTES, 3));
    expect(a.encrypted_payload).not.toBe(b.encrypted_payload);
  });

  it('rejects tampered ciphertext', () => {
    const sealed = seal(payload, key, iv);
    expect(() => open({ ...sealed, encrypted_payload: flipLastHex(sealed.encrypted_payload) }, key)).toThrow();
  });

  it('rejects a tampered IV', () => {
    const sealed = seal(payload, key, iv);
    expect(() => open({ ...sealed, initialization_vector_iv: flipLastHex(sealed.initialization_vector_iv) }, key)).toThrow();
  });

  it('rejects the wrong key', () => {
    expect(() => open(seal(payload, key, iv), bytes(KEY_BYTES, 9))).toThrow();
  });

  it('refuses keys and IVs of the wrong length', () => {
    expect(() => seal(payload, bytes(16, 1), iv)).toThrow('Key must be 32 bytes');
    expect(() => seal(payload, key, bytes(16, 2))).toThrow('IV must be 12 bytes');
  });
});