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

// Up to two players per chord, used in turn, so replaying a chord never cuts off the copy that's still ringing (an abrupt stop would click). The second is only made the first time the chord is replayed, so an instrument starts with 14 players rather than 28.
const VOICES = 2;
const pool = new Map<string, { players: AudioPlayer[]; next: number }>();
let modeSet = false;

export function ensureAudioMode() {
  if (modeSet) return;
  modeSet = true;
  // Play alongside the user's own music. Media follows the media volume, not the ringer: with this false, Android ignores play() entirely while the phone is on vibrate or silent
  setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: "mixWithOthers",
    shouldPlayInBackground: false,
  });
}

const keyOf = (instrument: Instrument, letter: Letter, mode: Mode) =>
  `${instrument}-${letter}-${mode}`;

/**
 Frees a player now. remove() alone only forgets it: the native player lives on until garbage collection, and Android only allows an app so many at once, after a few instrument switches new chords failed to play at all. release() frees it straight away.
 */
function free(player: AudioPlayer) {
  player.remove();
  player.release();
}

function voicesFor(instrument: Instrument, letter: Letter, mode: Mode) {
  const key = keyOf(instrument, letter, mode);
  let entry = pool.get(key);
  if (!entry) {
    entry = {
      players: [createAudioPlayer(CHORDS[instrument][letter][mode])],
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
  // The chord's second voice, made the first time it's needed
  if (entry.next >= entry.players.length)
    entry.players.push(createAudioPlayer(CHORDS[instrument][letter][mode]));
  const player = entry.players[entry.next];
  entry.next = (entry.next + 1) % VOICES;
  player.volume = volume;
  player.seekTo(0);
  player.play();
}

/**
 Load one instrument's chords so the first swipe plays instantly, and free the others — only the chosen instrument is kept in memory.
 */
export function preloadChords(instrument: Instrument) {
  ensureAudioMode();
  for (const [key, entry] of pool) {
    if (key.startsWith(`${instrument}-`)) continue;
    entry.players.forEach(free);
    pool.delete(key);
  }
  for (const letter of LETTERS)
    for (const mode of MODES) voicesFor(instrument, letter, mode);
}

/** Soft preview as an orb lands in the centre of the carousel. */
export function previewNote(
  letter: Letter,
  mode: Mode,
  instrument: Instrument,
) {
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
