import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isInstrument, type Instrument } from "@/audio/instruments";

// Device-only settings
type Preferences = {
  /** Play each note's vibration pattern (for deaf and hard-of-hearing users).*/
  feelNotes: boolean;
    /** What check-ins sound like. The last choice is remembered. */
  instrument: Instrument;
};

const DEFAULTS: Preferences = { feelNotes: false, instrument: "piano" };
const STORAGE_KEY = "sonata.preferences";

let current = DEFAULTS;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

// Load once at startup; the defaults apply until it finishes
AsyncStorage.getItem(STORAGE_KEY)
  .then((saved) => {
    if (!saved) return;
    current = { ...DEFAULTS, ...JSON.parse(saved) };
    // An instrument that's since been removed (e.g. "ambient") falls back to the default
    if (!isInstrument(current.instrument)) current.instrument = DEFAULTS.instrument;
    notify();
  })
  .catch(() => {});

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
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current[key],
  );
}