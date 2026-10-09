import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  PixelRatio,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Skia } from "@shopify/react-native-skia";
import { router, useIsFocused } from "expo-router";
import { useSharedValue } from "react-native-reanimated";
import { Screen } from "@/components/Screen";
import { TabHeader } from "@/components/TabHeader";
import { Sky } from "@/components/Sky";
import { ensureAudioMode, INSTRUMENT_LABELS } from "@/audio";
import { MODE_NAMES } from "@/engine";
import { DayChips } from "@/features/weekly/DayChips";
import { InstrumentPills } from "@/features/weekly/InstrumentPills";
import { SongDisc } from "@/features/weekly/SongDisc";
import { OrbitTransport } from "@/features/weekly/OrbitTransport";
import { makeDiscArt } from "@/features/weekly/discArt";
import { ComposingMoment } from "@/features/weekly/ComposingMoment";
import { LowMoodSheet } from "@/features/weekly/LowMoodSheet";
import { useComposingMoment } from "@/features/weekly/useComposingMoment";
import { useLowMoodOffer } from "@/features/weekly/useLowMoodOffer";
import {
  barAt,
  barStart,
  clock,
  nextBarStart,
  previousBarStart,
  weekRange,
  songFileName,
} from "@/features/weekly/songTime";
import { useWeekSong } from "@/features/weekly/useWeekSong";
import { SongActions } from "@/features/weekly/SongActions";
import { dayKey } from "@/lib/dates";
import type { PlaylistSong } from "@/lib/playlistSongs";
import colours from "@/theme/colours";

const ART_SIZE = Math.round(230 * PixelRatio.get()); // the disc's size in real pixels

export default function Weekly() {
  const {
    status,
    weekStart,
    weekKey,
    days,
    song,
    instrument,
    setInstrument,
    uri,
  } = useWeekSong();
  const player = useAudioPlayer(null, { updateInterval: 250 }); // the disc animates the ring in between
  const playback = useAudioPlayerStatus(player);
  const isFocused = useIsFocused();
  const ready = status === "ready";

  // Where we are in the song, in seconds. The player doesn't report new times while paused, so after a jump we show where we jumped to while the player is still reporting the old spot. (Worked out here rather than copied into state in an effect, which would re-render on every report.)
  const [jump, setJump] = useState<{ to: number; from: number } | null>(null);
  const position =
    jump &&
    Math.abs(playback.currentTime - jump.from) < 1 &&
    Math.abs(playback.currentTime - jump.to) > 1
      ? jump.to
      : playback.currentTime;

  // Switching instrument loads a new file: carry on from the same moment
  const resume = useRef({ time: 0, playing: false });
  useEffect(() => {
    resume.current = { time: position, playing: playback.playing };
  });
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
    setJump({ to: time, from: playback.currentTime });
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

  // "Composing your week" after each new check-in, then (if the week has been heavy) a gentle offer
  const { revealing } = useComposingMoment(weekKey, ready);
  const { offer, dismiss } = useLowMoodOffer();
  // Shown a moment after it becomes due, to let the song settle in first
  const due = offer && !revealing && isFocused ? weekKey : null;
  const [settled, setSettled] = useState<string | null>(null);
  useEffect(() => {
    if (!due) return;
    const timer = setTimeout(() => setSettled(due), 1200);
    return () => clearTimeout(timer);
  }, [due]);
  const offerShown = due !== null && settled === due;
  const ground = () => {
    dismiss();
    player.pause();
    router.push("/breathing");
  };

  const started = playback.playing || position > 0;
  // The week as a playlist entry (its notes, so it always sounds the same)
  const playlistSong: PlaylistSong | null =
    days && song
      ? {
          kind: "week",
          week: dayKey(weekStart),
          instrument,
          days: days.map((d) => d && { note: d.note, mode: d.mode }),
        }
      : null;
  const currentDay =
    song && ready && started ? barAt(position, song.tempo) : null;
  const next = song ? nextBarStart(position, song.tempo) : null;

  const header = (
    <TabHeader title="Your week in sound">
      <Text className="font-sans text-caption text-secondary">
        {weekRange(weekStart)}
      </Text>
    </TabHeader>
  );

  return (
    <View className="flex-1">
      <Screen
        header={header}
        background={<Sky glow={wash} animated={isFocused} pace={1.6} />}
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
            Your song couldn&apos;t be made just now. Try opening this tab
            again.
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

            <OrbitTransport
              playing={playback.playing}
              disabled={!ready}
              canGoForward={next !== null}
              orb={
                song
                  ? colours.orb[song.palette[0].note][song.palette[0].mode]
                  : colours.orb.C.major
              }
              moon={
                song
                  ? colours.orb[song.palette[1].note][song.palette[1].mode]
                  : colours.orb.C.major
              }
              onToggle={toggle}
              onBack={() =>
                song && seek(previousBarStart(position, song.tempo))
              }
              onForward={() => next !== null && seek(next)}
            />

            <InstrumentPills instrument={instrument} onChange={setInstrument} />

            <DayChips days={days} current={currentDay} onSelect={playFromDay} />

            <SongActions
              uri={uri}
              fileName={songFileName(weekStart, INSTRUMENT_LABELS[instrument])}
              playlistSong={playlistSong}
            />

            <Text className="font-sans text-caption text-muted">
              {MODE_NAMES[song.mode]} · {song.tempo} BPM
            </Text>
          </ScrollView>
        )}
      </Screen>
      <ComposingMoment visible={revealing} days={days ?? []} />
      <LowMoodSheet
        visible={offerShown}
        onGround={ground}
        onDismiss={dismiss}
      />
    </View>
  );
}
