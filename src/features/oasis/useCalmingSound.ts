import { useEffect, useState } from "react";
import { useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from "expo-audio";
import { useIsFocused } from "expo-router";
import { takeTurn } from "@/audio/turns";
import type { CalmingSound } from "./calmingSounds";

// Settings go on the player itself; they live out here because a hook's return value can't be changed inside the hook

/** Calming sounds always loop, and looping carries over when the sound is replaced. */
function setLooping(player: AudioPlayer) {
  player.loop = true;
}

/** Load a sound at its own volume, so every sound plays at the same loudness. */
function load(player: AudioPlayer, sound: CalmingSound) {
  player.replace(sound.source);
  player.volume = sound.volume;
}

/**
 Plays one calming sound at a time, on a loop, pausing anything else Sonata is playing. The player belongs to the screen and is freed (stopping the sound) when it closes: a player kept for the app's life could be left unusable by
 Android, and the screen then failed to draw until a restart.
 */
export function useCalmingSound() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const isFocused = useIsFocused();
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => setLooping(player), [player]);

  useEffect(() => {
    if (!isFocused) player.pause();
  }, [isFocused, player]);

  /** Play a sound, or pause / carry on if it's the one already loaded. */
  const toggle = (sound: CalmingSound) => {
    if (sound.id === current) {
      if (status.playing) return player.pause();
    } else {
      load(player, sound);
      setCurrent(sound.id);
    }
    takeTurn(player, () => player.pause());
    player.play();
  };

  return { current, playing: status.playing, toggle };
}
