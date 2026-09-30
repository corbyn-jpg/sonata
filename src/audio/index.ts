import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { LETTERS, type Letter, type Mode } from "@/data/notes";

// Pre-rendered by scripts/render-chords.mjs — change the voice there, then `npm run render:chords`
const CHORDS: Record<Letter, Record<Mode, number>> = {
  C: {
    major: require("../../assets/sounds/c-major.wav"),
    minor: require("../../assets/sounds/c-minor.wav"),
  },
  D: {
    major: require("../../assets/sounds/d-major.wav"),
    minor: require("../../assets/sounds/d-minor.wav"),
  },
  E: {
    major: require("../../assets/sounds/e-major.wav"),
    minor: require("../../assets/sounds/e-minor.wav"),
  },
  F: {
    major: require("../../assets/sounds/f-major.wav"),
    minor: require("../../assets/sounds/f-minor.wav"),
  },
  G: {
    major: require("../../assets/sounds/g-major.wav"),
    minor: require("../../assets/sounds/g-minor.wav"),
  },
  A: {
    major: require("../../assets/sounds/a-major.wav"),
    minor: require("../../assets/sounds/a-minor.wav"),
  },
  B: {
    major: require("../../assets/sounds/b-major.wav"),
    minor: require("../../assets/sounds/b-minor.wav"),
  },
};

const MODES: Mode[] = ["major", "minor"];

// Two players per chord, used in turn, so replaying a chord never cuts off the copy
// that's still ringing (an abrupt stop would click)
const VOICES = 2;
const pool = new Map<string, { players: AudioPlayer[]; next: number }>();
let modeSet = false;

function ensureAudioMode() {
  if (modeSet) return;
  modeSet = true;
  // Play alongside the user's own music, and stay quiet when an iPhone is on silent
  setAudioModeAsync({
    playsInSilentMode: false,
    interruptionMode: "mixWithOthers",
    shouldPlayInBackground: false,
  });
}

function voicesFor(letter: Letter, mode: Mode) {
  const key = `${letter}-${mode}`;
  let entry = pool.get(key);
  if (!entry) {
    const source = CHORDS[letter][mode];
    entry = {
      players: Array.from({ length: VOICES }, () => createAudioPlayer(source)),
      next: 0,
    };
    pool.set(key, entry);
  }
  return entry;
}

function play(letter: Letter, mode: Mode, volume: number) {
  ensureAudioMode();
  const entry = voicesFor(letter, mode);
  const player = entry.players[entry.next];
  entry.next = (entry.next + 1) % VOICES;
  player.volume = volume;
  player.seekTo(0);
  player.play();
}

/** Load every chord up front, so the first swipe plays instantly. */
export function preloadChords() {
  ensureAudioMode();
  for (const letter of LETTERS) for (const mode of MODES) voicesFor(letter, mode);
}

/** Soft preview as an orb lands in the centre of the carousel. */
export function previewNote(letter: Letter, mode: Mode) {
  play(letter, mode, 0.45);
}

/** Fuller chord when an orb is chosen. */
export function chooseNote(letter: Letter, mode: Mode) {
  play(letter, mode, 1);
}
