import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, PixelRatio, ScrollView, Text, View } from "react-native";
import { useIsFocused } from "expo-router";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Skia } from "@shopify/react-native-skia";
import { useSharedValue } from "react-native-reanimated";
import { Screen } from "@/components/Screen";
import { Sky } from "@/components/Sky";
import { ensureAudioMode } from "@/audio";
import { MODE_NAMES } from "@/engine";
import { DayChips } from "@/features/weekly/DayChips";
import { InstrumentPills } from "@/features/weekly/InstrumentPills";
import { SongDisc } from "@/features/weekly/SongDisc";
import { WavyTransport } from "@/features/weekly/WavyTransport";
import { makeDiscArt } from "@/features/weekly/discArt";
import { barAt, barStart, clock, nextBarStart, previousBarStart, weekRange } from "@/features/weekly/songTime";
import { useWeekSong } from "@/features/weekly/useWeekSong";
import { dayKey } from "@/lib/dates";
import colours from "@/theme/colours";

const ART_SIZE = Math.round(230 * PixelRatio.get()); // the disc's size in real pixels

export default function Weekly() {
  const { status, weekStart, days, song, instrument, setInstrument, uri } = useWeekSong();
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const playback = useAudioPlayerStatus(player);
  const isFocused = useIsFocused();
  const ready = status === "ready";

  // Switching instrument loads a new file: carry on from the same moment
  const resume = useRef({ time: 0, playing: false });
  resume.current = { time: playback.currentTime, playing: playback.playing };
  useEffect(() => {
    if (!uri) return;
    const { time, playing } = resume.current;
    player.replace({ uri });
    if (time > 0) player.seekTo(time);
    if (playing) player.play();
  }, [uri, player]);

  useEffect(() => {
    ensureAudioMode();
  }, []);

  useEffect(() => {
    if (!isFocused) player.pause(); // stop when another tab opens
  }, [isFocused, player]);

    // The disc's face is a space scene painted from the week; the sky's wash is its main colour
  const art = useMemo(
    () => (song && days ? makeDiscArt(days, song, ART_SIZE, dayKey(weekStart)) : null),
    [song, days, weekStart],
  );
  
  const glowColour = song ? colours.orb[song.palette[0].note][song.palette[0].mode].core : colours.violet[500];
  const wash = useSharedValue([0, 0, 0, 0]);
  useEffect(() => {
    const [r, g, b] = Skia.Color(glowColour);
    wash.value = [r, g, b, 0.75];
  }, [glowColour, wash]);

  const seek = (seconds: number) => player.seekTo(Math.max(0, seconds));
  const toggle = () => {
    if (playback.playing) return player.pause();
    if (playback.duration > 0 && playback.currentTime >= playback.duration - 0.05) player.seekTo(0);
    player.play();
  };
  const playFromDay = (day: number) => {
    if (!song) return;
    seek(barStart(day, song.tempo));
    if (!playback.playing) player.play();
  };

  const started = playback.playing || playback.currentTime > 0;
  const currentDay = song && ready && started ? barAt(playback.currentTime, song.tempo) : null;
  const next = song ? nextBarStart(playback.currentTime, song.tempo) : null;

  const header = (
    <View className="mb-6 items-center gap-1">
      <Text className="font-mono-medium text-h3 text-primary">Your week in sound</Text>
      <Text className="font-sans text-caption text-secondary">{weekRange(weekStart)}</Text>
    </View>
  );

  return (
    <Screen header={header} background={<Sky glow={wash} animated={isFocused} pace={1.4} />}>
      {status === "loading" && <ActivityIndicator color={colours.violet[200]} />}

      {status === "empty" && (
        <Text className="text-center font-sans text-body text-secondary">
          Your song begins with your first check-in this week.
        </Text>
      )}

      {status === "error" && (
        <Text className="text-center font-sans text-body text-secondary">
          Your song couldn&apos;t be made just now. Try opening this tab again.
        </Text>
      )}

      {song && days && (status === "composing" || ready) && (
        <ScrollView
          contentContainerClassName="items-center gap-6 pb-32"
          showsVerticalScrollIndicator={false}
        >
          <SongDisc
            art={art}
            glow={glowColour}
            playing={playback.playing}
            currentTime={playback.currentTime}
            duration={ready ? playback.duration : 0}
            active={isFocused}
            onSeek={seek}
          />

          {ready ? (
            <Text className="font-mono text-body text-secondary">
              {clock(playback.currentTime)} · {clock(playback.duration)}
            </Text>
          ) : (
            <View className="flex-row items-center gap-3">
              <ActivityIndicator color={colours.violet[200]} />
              <Text className="font-sans text-body text-secondary">Composing your week&apos;s melody…</Text>
            </View>
          )}

          <WavyTransport
            playing={playback.playing}
            disabled={!ready}
            canGoForward={next !== null}
            onToggle={toggle}
            onBack={() => song && seek(previousBarStart(playback.currentTime, song.tempo))}
            onForward={() => next !== null && seek(next)}
          />

          <InstrumentPills instrument={instrument} onChange={setInstrument} />

          <DayChips days={days} current={currentDay} onSelect={playFromDay} />

          <Text className="font-sans text-caption text-muted">
            {MODE_NAMES[song.mode]} · {song.tempo} BPM
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}