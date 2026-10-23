import * as SecureStore from "expo-secure-store";

// Where the encryption key is kept: the phone's secure storage, available only on this device once it's unlocked.
// Browsers have no secure storage, so the web uses keyStore.web.ts.

export const readKey = (name: string) => SecureStore.getItemAsync(name);

export const writeKey = (name: string, hex: string) =>
  SecureStore.setItemAsync(name, hex, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });

export const deleteKey = (name: string) => SecureStore.deleteItemAsync(name);
