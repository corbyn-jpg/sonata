import { useEffect, useRef } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useIsFocused } from "expo-router";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Pause, Play } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { ensureAudioMode, INSTRUMENT_LABELS, INSTRUMENTS } from "@/audio";
import { displayName, spokenName } from "@/data/notes";
import { MODE_NAMES } from "@/engine";
import { useWeekSong } from "@/features/weekly/useWeekSong";
import colours from "@/theme/colours";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// A plain first version to hear the AI's songs. The disc, ring and wavy capsule come next.
export default function Weekly() {
  const { status, days, song, instrument, setInstrument, uri } = useWeekSong();
  const player = useAudioPlayer(null);
  const playback = useAudioPlayerStatus(player);
  const isFocused = useIsFocused();

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

  const toggle = () => {
    if (playback.playing) return player.pause();
    if (playback.duration > 0 && playback.currentTime >= playback.duration - 0.05) player.seekTo(0);
    player.play();
  };

  const logged = days?.filter(Boolean).length ?? 0;

  return (
    <Screen title={logged === 7 ? "This week's song" : "Your week so far"}>
      {status === "loading" && <ActivityIndicator color={colours.violet[200]} />}

      {status === "empty" && (
        <Text className="font-sans text-body text-secondary">
          Your song begins with your first check-in this week.
        </Text>
      )}

      {status === "error" && (
        <Text className="font-sans text-body text-secondary">
          Your song couldn&apos;t be made just now. Try opening this tab again.
        </Text>
      )}

      {song && (status === "composing" || status === "ready") && (
        <View className="gap-8">
          <View className="flex-row justify-between">
            {DAYS.map((label, i) => {
              const day = days?.[i];
              return (
                <View
                  key={label}
                  className="items-center gap-1"
                  accessible
                  accessibilityLabel={`${DAY_NAMES[i]}: ${day ? spokenName(day.note, day.mode) : "no check-in"}`}
                >
                  <Text className="font-sans text-caption text-muted">{label}</Text>
                  <Text className="font-mono-medium text-h4 text-primary">
                    {day ? displayName(day.note, day.mode) : "–"}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text className="font-sans text-body text-secondary">
            {MODE_NAMES[song.mode]} · {song.tempo} BPM
          </Text>

          <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
            {INSTRUMENTS.map((option) => {
              const active = option === instrument;
              return (
                <Pressable
                  key={option}
                  onPress={() => setInstrument(option)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  className={`h-11 justify-center rounded-pill border px-4 ${active ? "border-violet-500 bg-violet-700" : "border-border bg-surface/60"}`}
                >
                  <Text className={`font-sans-medium text-caption ${active ? "text-primary" : "text-secondary"}`}>
                    {INSTRUMENT_LABELS[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {status === "composing" ? (
            <View className="flex-row items-center gap-3">
              <ActivityIndicator color={colours.violet[200]} />
              <Text className="font-sans text-body text-secondary">Composing your week&apos;s melody…</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-4">
              <Pressable
                onPress={toggle}
                accessibilityRole="button"
                accessibilityLabel={playback.playing ? "Pause" : "Play"}
                className="h-16 w-16 items-center justify-center rounded-pill bg-violet-700"
              >
                {playback.playing ? (
                  <Pause color={colours.textPrimary} size={28} strokeWidth={1.5} />
                ) : (
                  <Play color={colours.textPrimary} size={28} strokeWidth={1.5} />
                )}
              </Pressable>
              <Text className="font-mono text-body text-secondary">
                {clock(playback.currentTime)} / {clock(playback.duration)}
              </Text>
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}