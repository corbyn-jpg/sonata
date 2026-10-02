import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  PixelRatio,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
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
import { DEMO_NAMES, type DemoWeek } from "@/features/weekly/demoWeeks";
import {
  barAt,
  barStart,
  clock,
  nextBarStart,
  previousBarStart,
  weekRange,
} from "@/features/weekly/songTime";
import { useWeekSong } from "@/features/weekly/useWeekSong";
import { dayKey } from "@/lib/dates";
import colours from "@/theme/colours";

const ART_SIZE = Math.round(230 * PixelRatio.get()); // the disc's size in real pixels

export default function Weekly() {
  const [demo, setDemo] = useState<DemoWeek | null>(null); // development builds only
  const { status, weekStart, days, song, instrument, setInstrument, uri } =
    useWeekSong(demo);
  const player = useAudioPlayer(null, { updateInterval: 250 }); // the disc animates the ring in between
  const playback = useAudioPlayerStatus(player);
  const isFocused = useIsFocused();
  const ready = status === "ready";

  // Where we are in the song, in seconds. The player doesn't report new times while paused, so after a jump we show where we jumped to until the player reports a time of its own. (Worked out here rather than copied into state in an effect, which would re-render on every report.)
  const [jump, setJump] = useState<{
    to: number;
    at: number;
    from: number;
  } | null>(null);
  const position =
    jump && (Date.now() - jump.at < 400 || playback.currentTime === jump.from)
      ? jump.to
      : playback.currentTime;

  // Switching instrument loads a new file: carry on from the same moment
  const resume = useRef({ time: 0, playing: false });
  resume.current = { time: position, playing: playback.playing };
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
    () =>
      song && days
        ? makeDiscArt(days, song, ART_SIZE, dayKey(weekStart))
        : null,
    [song, days, weekStart],
  );

  const glowColour = song
    ? colours.orb[song.palette[0].note][song.palette[0].mode].core
    : colours.violet[500];
  const wash = useSharedValue([0, 0, 0, 0]);
  useEffect(() => {
    const [r, g, b] = Skia.Color(glowColour);
    wash.value = [r, g, b, 0.75];
  }, [glowColour, wash]);

  const seek = (seconds: number) => {
    const time = Math.min(Math.max(0, seconds), playback.duration || Infinity);
    setJump({ to: time, at: Date.now(), from: playback.currentTime });
    player.seekTo(time);
  };

  const toggle = () => {
    if (playback.playing) return player.pause();
    if (playback.duration > 0 && position >= playback.duration - 0.05) seek(0); // finished: start again
    player.play();
  };
  const playFromDay = (day: number) => {
    if (!song) return;
    seek(barStart(day, song.tempo));
    if (!playback.playing) player.play();
  };

  const started = playback.playing || position > 0;
  const currentDay =
    song && ready && started ? barAt(position, song.tempo) : null;
  const next = song ? nextBarStart(position, song.tempo) : null;

  const header = (
    <View className="mb-6 items-center gap-1">
      <Text className="font-mono-medium text-h3 text-primary">
        Your week in sound
      </Text>
      <Text className="font-sans text-caption text-secondary">
        {demo ? `Example week · ${demo}` : weekRange(weekStart)}
      </Text>
      {__DEV__ && (
        // Try every record design without waiting a week. Not in release builds.
        <View className="mt-2 flex-row flex-wrap justify-center gap-1">
          {[null, ...DEMO_NAMES].map((option) => (
            <Pressable
              key={option ?? "real"}
              onPress={() => setDemo(option)}
              className={`rounded-pill border px-3 py-1 ${demo === option ? "border-violet-500 bg-violet-700/60" : "border-border"}`}
            >
              <Text className="font-sans text-caption text-secondary">
                {option ?? "This week"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Screen
      header={header}
      background={<Sky glow={wash} animated={isFocused} pace={1.4} />}
    >
      {status === "loading" && (
        <ActivityIndicator color={colours.violet[200]} />
      )}

      {status === "empty" && (
        <Text className="text-center font-sans text-body text-secondary">
          Your song begins with your first check-in this week.
        </Text>
      )}

      {status === "offline" && (
        <Text className="text-center font-sans text-body text-secondary">
          Your week couldn&apos;t be loaded. Check your connection, then open
          this tab again.
        </Text>
      )}

      {status === "error" && (
        <Text className="text-center font-sans text-body text-secondary">
          Your song couldn&apos;t be made just now. Try opening this tab again.
        </Text>
      )}

      {song && days && (status === "composing" || ready) && (
        <ScrollView
          contentContainerClassName="items-center gap-5 pb-8"
          showsVerticalScrollIndicator={false}
        >
          <SongDisc
            art={art}
            glow={glowColour}
            playing={playback.playing}
            currentTime={position}
            duration={ready ? playback.duration : 0}
            active={isFocused}
            onSeek={seek}
          />

          {ready ? (
            <Text className="font-mono text-body text-secondary">
              {clock(position)} · {clock(playback.duration)}
            </Text>
          ) : (
            <View className="flex-row items-center gap-3">
              <ActivityIndicator color={colours.violet[200]} />
              <Text className="font-sans text-body text-secondary">
                Composing your week&apos;s melody…
              </Text>
            </View>
          )}

          <WavyTransport
            playing={playback.playing}
            disabled={!ready}
            canGoForward={next !== null}
            onToggle={toggle}
            onBack={() => song && seek(previousBarStart(position, song.tempo))}
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
