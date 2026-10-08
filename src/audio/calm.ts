import { createAudioPlayer, type AudioPlayer } from "expo-audio";

let player: AudioPlayer | null = null;

/**
 The one player for calming sounds, made the first time it's needed and kept for the app's life (like the chimes). It always loops, which has to be set on the player itself
 */
export function calmPlayer() {
  if (!player) {
    player = createAudioPlayer(null);
    player.loop = true;
  }
  return player;
}

/** Load a calming sound at its own volume, so every sound plays at the same loudness. */
export function loadCalm(source: number, volume: number) {
  const calm = calmPlayer();
  calm.replace(source);
  calm.volume = volume;
}
