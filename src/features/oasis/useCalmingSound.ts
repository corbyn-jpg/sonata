import { useEffect, useState } from "react";
import { useAudioPlayerStatus } from "expo-audio";
import { useIsFocused } from "expo-router";
import { calmPlayer, loadCalm } from "@/audio/calm";
import { takeTurn } from "@/audio/turns";
import type { CalmingSound } from "./calmingSounds";

/**
 Plays one calming sound at a time, on a loop. Starting one pauses anything else Sonata is playing, and it stops when the screen is left, so it never carries on unnoticed.
 */
export function useCalmingSound() {
  const [player] = useState(calmPlayer);
  const status = useAudioPlayerStatus(player);
  const isFocused = useIsFocused();
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    if (!isFocused) player.pause();
  }, [isFocused, player]);

  /** Play a sound, or pause / carry on if it's the one already loaded. */
  const toggle = (sound: CalmingSound) => {
    if (sound.id === current) {
      if (status.playing) return player.pause();
    } else {
      loadCalm(sound.source, sound.volume);
      setCurrent(sound.id);
    }
    takeTurn(player, () => player.pause());
    player.play();
  };

  return { current, playing: status.playing, toggle };
}
