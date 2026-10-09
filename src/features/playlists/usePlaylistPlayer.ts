import { useEffect, useRef, useState } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useIsFocused } from "expo-router";
import { renderSong } from "@/audio/song";
import { takeTurn } from "@/audio/turns";
import type { Playable } from "@/audio/mixer";
import { songCacheName, type PlaylistSong } from "@/lib/playlistSongs";

/**
 Plays a playlist in order. Each song is made just before it plays (about a second, or straight away if it's been played before), so a long playlist never has to be made all at once.
 */
export function usePlaylistPlayer(
  songs: readonly PlaylistSong[],
  compositions: readonly Playable[],
) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const isFocused = useIsFocused();
  const [current, setCurrent] = useState<number | null>(null); // which song is loaded
  const [loading, setLoading] = useState(false);
  const request = useRef(0); // the newest song asked for: a slower, older one that finishes late is ignored

  const playAt = async (index: number) => {
    const ticket = ++request.current;
    if (index >= songs.length) {
      setCurrent(null); // the end of the playlist
      return;
    }
    setCurrent(index);
    setLoading(true);
    try {
      const file = await renderSong(
        compositions[index],
        songs[index].instrument,
        songCacheName(songs[index]),
      );
      if (ticket !== request.current) return;
      player.replace({ uri: file.uri });
      takeTurn(player, () => player.pause()); // anything else playing pauses
      player.play();
    } catch (error) {
      console.warn("Couldn't play a playlist song:", error);
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  };

  // When a song ends, the next one starts
  const onFinish = useRef(() => {});
  useEffect(() => {
    onFinish.current = () => {
      if (current !== null) void playAt(current + 1);
    };
  });
  useEffect(() => {
    const subscription = player.addListener(
      "playbackStatusUpdate",
      (update) => {
        if (update.didJustFinish) onFinish.current();
      },
    );
    return () => subscription.remove();
  }, [player]);

  useEffect(() => {
    if (!isFocused) player.pause(); // stop when the screen is left
  }, [isFocused, player]);

  /** Play or pause one song: the one already loaded carries on where it was. */
  const toggle = (index: number) => {
    if (index !== current) return void playAt(index);
    if (status.playing) return player.pause();
    if (status.duration > 0 && status.currentTime >= status.duration - 0.05)
      player.seekTo(0); // finished: start again
    takeTurn(player, () => player.pause()); // anything else playing pauses
    player.play();
  };

  /** The whole playlist from the top, or pause / carry on if it's already going. */
  const playAll = () => (current === null ? void playAt(0) : toggle(current));

  /** Stop and unload (e.g. before the songs change). */
  const stop = () => {
    request.current++;
    player.pause();
    setCurrent(null);
    setLoading(false);
  };

  return { current, playing: status.playing, loading, toggle, playAll, stop };
}
