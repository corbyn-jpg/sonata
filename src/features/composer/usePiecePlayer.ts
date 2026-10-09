import { useEffect, useRef, useState } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { File } from "expo-file-system";
import { useIsFocused } from "expo-router";
import { ensureAudioMode, type Instrument } from "@/audio";
import { renderSong } from "@/audio/song";
import { takeTurn } from "@/audio/turns";
import { composePiece, type Piece } from "@/engine";
import { hashString } from "@/engine/random";

/**
 Plays the piece on the grid from the start. It's mixed to a WAV when Play is pressed (about a second), so every
 change is heard; any edit stops the old version. Only the newest version's file is kept, so editing doesn't fill
 the cache.
 */
export function usePiecePlayer(piece: Piece, instrument: Instrument) {
  const player = useAudioPlayer(null, { updateInterval: 100 }); // often enough for the playhead
  const status = useAudioPlayerStatus(player);
  const isFocused = useIsFocused();
  const [making, setMaking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null); // which version is in the player

  const song = composePiece(piece);
  // Named by the notes, tempo, harmony and instrument, so a changed piece is a new file
  const name = `piece-${hashString(JSON.stringify(piece)).toString(36)}`;
  const version = `${name}-${instrument}`;
  const current = loaded === version;

  const latest = useRef(version); // the newest version, for a render that finishes after an edit
  const lastFile = useRef<File | null>(null);
  useEffect(() => {
    latest.current = version;
    player.pause(); // an edit stops the old version
  }, [version, player]);

  useEffect(() => {
    if (!isFocused) player.pause(); // stop when the screen is left
  }, [isFocused, player]);

  const start = () => {
    takeTurn(player, () => player.pause()); // anything else playing pauses
    player.seekTo(0);
    player.play();
  };

  const play = async () => {
    if (song.beats === 0 || making) return;
    ensureAudioMode();
    if (current) return start();

    setMaking(true);
    setFailed(false);
    try {
      const file = await renderSong(song, instrument, name);
      if (latest.current !== version) return; // edited while it was being made
      player.replace({ uri: file.uri });
      if (lastFile.current && lastFile.current.uri !== file.uri)
        try {
          lastFile.current.delete();
        } catch {
          // already gone
        }
      lastFile.current = file;
      setLoaded(version);
      start();
    } catch (error) {
      console.warn(
        "Couldn't play the piece:",
        error instanceof Error ? error.message : error,
      );
      setFailed(true);
    } finally {
      setMaking(false);
    }
  };

  const stop = () => {
    player.pause();
    player.seekTo(0);
  };

  const playing = current && status.playing;
  const beat = Math.floor((status.currentTime * piece.tempo) / 60);
  return {
    play: () => void play(),
    stop,
    playing,
    making,
    /** The last Play couldn't make the audio. */
    failed,
    /** The step being played (null while stopped, and during the final ring-out). */
    step: playing && beat < song.beats ? beat : null,
  };
}
