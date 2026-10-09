import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isInstrument, type Instrument } from "@/audio/instruments";

type Preferences = {
  /** Play each note's vibration pattern (for deaf and hard-of-hearing users).*/
  feelNotes: boolean;
  /** What check-ins sound like. The last choice is remembered. */
  instrument: Instrument;
  /** The daily reminder (a local notification), off until the user turns it on. */
  reminder: boolean;
  /** When it arrives, in minutes after midnight. */
  reminderAt: number;
  /** The intro has been seen (or skipped). Delete all data clears it, so a fresh start shows it again. */
  onboarded: boolean;
};

const DEFAULTS: Preferences = {
  feelNotes: false,
  instrument: "piano",
  reminder: false,
  reminderAt: 21 * 60 + 30,
  onboarded: false,
};
const STORAGE_KEY = "sonata.preferences";

let current = DEFAULTS;
let ready = false; // the saved preferences have been read (or there were none)
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// Load once at startup; the defaults apply until it finishes
AsyncStorage.getItem(STORAGE_KEY)
  .then((saved) => {
    if (!saved) return;
    current = { ...DEFAULTS, ...JSON.parse(saved) };
    // An instrument that's since been removed (e.g. "ambient") falls back to the default
    if (!isInstrument(current.instrument))
      current.instrument = DEFAULTS.instrument;
  })
  .catch(() => {})
  .finally(() => {
    ready = true;
    notify();
  });

export function setPreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
) {
  current = { ...current, [key]: value };
  notify();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => {});
}

/** Read a preference and re-render whenever it changes, on any screen. */
export function usePreference<K extends keyof Preferences>(
  key: K,
): Preferences[K] {
  return useSyncExternalStore(subscribe, () => current[key]);
}

/** Whether the saved preferences have been read yet: until then they're only the defaults. */
export function usePreferencesReady() {
  return useSyncExternalStore(subscribe, () => ready);
}
