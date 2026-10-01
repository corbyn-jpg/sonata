import { Platform, Vibration } from "react-native";
import * as Haptics from "expo-haptics";
import type { Letter, Mode } from "@/data/notes";
import { pulsesFor, toVibrationPattern } from "./patterns";

let timers: ReturnType<typeof setTimeout>[] = [];

function stop() {
  Vibration.cancel();
  timers.forEach(clearTimeout);
  timers = [];
}

/** Play a note's vibration pattern, so it can be felt as well as heard. */
export function feelNote(letter: Letter, mode: Mode) {
  stop(); // a new note replaces one that's still buzzing
  const pulses = pulsesFor(letter, mode);

  if (Platform.OS === "android") {
    Vibration.vibrate(toVibrationPattern(pulses));
    return;
  }

  // iOS can't set vibration lengths, so play its preset taps in the same rhythm
  const style =
    mode === "minor"
      ? Haptics.ImpactFeedbackStyle.Heavy
      : Haptics.ImpactFeedbackStyle.Light;
  timers = pulses.map(({ at }) =>
    setTimeout(() => Haptics.impactAsync(style), at),
  );
}