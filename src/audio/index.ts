import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { LETTERS, type Letter, type Mode } from "@/data/notes";
import { CHIMES, CHORDS, type Chime } from "./chords.generated";
import type { Instrument } from "./instruments";

export { INSTRUMENTS, INSTRUMENT_LABELS, type Instrument } from "./instruments";
export type { Chime } from "./chords.generated";

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

const keyOf = (instrument: Instrument, letter: Letter, mode: Mode) =>
  `${instrument}-${letter}-${mode}`;

function voicesFor(instrument: Instrument, letter: Letter, mode: Mode) {
  const key = keyOf(instrument, letter, mode);
  let entry = pool.get(key);
  if (!entry) {
    const source = CHORDS[instrument][letter][mode];
    entry = {
      players: Array.from({ length: VOICES }, () => createAudioPlayer(source)),
      next: 0,
    };
    pool.set(key, entry);
  }
  return entry;
}

function play(
  instrument: Instrument,
  letter: Letter,
  mode: Mode,
  volume: number,
) {
  ensureAudioMode();
  const entry = voicesFor(instrument, letter, mode);
  const player = entry.players[entry.next];
  entry.next = (entry.next + 1) % VOICES;
  player.volume = volume;
  player.seekTo(0);
  player.play();
}

/**
 * Load one instrument's chords so the first swipe plays instantly, and free the others —
 * only the chosen instrument is kept in memory.
 */
export function preloadChords(instrument: Instrument) {
  ensureAudioMode();
  for (const [key, entry] of pool) {
    if (key.startsWith(`${instrument}-`)) continue;
    entry.players.forEach((player) => player.remove());
    pool.delete(key);
  }
  for (const letter of LETTERS)
    for (const mode of MODES) voicesFor(instrument, letter, mode);
}

/** Soft preview as an orb lands in the centre of the carousel. */
export function previewNote(letter: Letter, mode: Mode, instrument: Instrument) {
  play(instrument, letter, mode, 0.45);
}

/** Fuller chord when an orb is chosen. */
export function chooseNote(letter: Letter, mode: Mode, instrument: Instrument) {
  play(instrument, letter, mode, 1);
}

// One player per chime: each is short and never overlaps itself
const chimes = new Map<Chime, AudioPlayer>();

/** A glockenspiel or wind-chime cue: save, week composed, breathing. */
export function playChime(chime: Chime, volume = 1) {
  ensureAudioMode();
  let player = chimes.get(chime);
  if (!player) {
    player = createAudioPlayer(CHIMES[chime]);
    chimes.set(chime, player);
  }
  player.volume = volume;
  player.seekTo(0);
  player.play();
}