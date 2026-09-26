// firebase/auth ships browser types only; the React Native build (which Metro
// resolves at runtime) also exports this.
import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}