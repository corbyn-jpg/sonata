import { useMemo } from "react";
import {
  ActivityIndicator,
  PixelRatio,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Pause, Play } from "lucide-react-native";
import { INSTRUMENT_LABELS } from "@/audio";
import { composeWeek } from "@/engine";
import { usePlaylistPlayer } from "@/features/playlists/usePlaylistPlayer";
import { makeDiscArt } from "@/features/weekly/discArt";
import { dayKey, startOfWeek } from "@/lib/dates";
import type { PlaylistSong } from "@/lib/playlistSongs";
import colours from "@/theme/colours";
import { shortDate, type MonthWeek } from "./month";
import { SmallDisc } from "./SmallDisc";

const DISC = 84;
const ART_PX = Math.round(DISC * PixelRatio.get()); // the art's size in real pixels

type Props = { weeks: readonly MonthWeek[]; today: Date };

/**
 Every week that starts in the month, as a small record. A week with check-ins shows its disc art; tap it to play its song (the next week follows on). Weeks without a song are dashed outlines.
 */
export function WeeksShelf({ weeks, today }: Props) {
  // Each week's song is composed exactly as the Weekly tab composes it, so it sounds the same (and reuses its audio file)
  const shelf = useMemo(
    () =>
      weeks.map((week) => {
        if (week.mode === null) return { week, song: null };
        const key = dayKey(week.start);
        const composition = composeWeek(week.days, key);
        const song: PlaylistSong = {
          kind: "week",
          week: key,
          instrument: week.instrument,
          days: [...week.days],
        };
        return {
          week,
          song,
          composition,
          art: makeDiscArt(week.days, composition, ART_PX, key),
        };
      }),
    [weeks],
  );
  const playable = useMemo(
    () => shelf.flatMap((s) => (s.song ? [s] : [])),
    [shelf],
  );
  const { current, playing, loading, toggle } = usePlaylistPlayer(
    useMemo(() => playable.map((s) => s.song), [playable]),
    useMemo(() => playable.map((s) => s.composition), [playable]),
  );

  const thisWeek = dayKey(startOfWeek(today));

  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-mono-medium text-h4 text-primary">Weeks</Text>
        {weeks.length > 3 && (
          <Text className="font-sans text-caption text-muted">
            Swipe for more
          </Text>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-4"
      >
        {shelf.map(({ week, song, art }) => {
          const key = dayKey(week.start);
          const label = key === thisWeek ? "This week" : shortDate(week.start);
          if (!song) {
            const future = week.start > today;
            return (
              <View
                key={key}
                className="items-center gap-2"
                accessible
                accessibilityLabel={`Week of ${shortDate(week.start)}, ${future ? "still to come" : "no check-ins"}`}
              >
                <View
                  style={{ width: DISC, height: DISC }}
                  className="rounded-full border border-dashed border-border"
                />
                <Text className="font-sans text-caption text-muted">
                  {label}
                </Text>
              </View>
            );
          }
          const index = playable.findIndex((s) => s.song === song);
          const active = index === current;
          return (
            <Pressable
              key={key}
              onPress={() => toggle(index)}
              accessibilityRole="button"
              accessibilityLabel={`${active && playing ? "Pause" : "Play"} the week of ${shortDate(week.start)}, ${INSTRUMENT_LABELS[song.instrument]}`}
              className="items-center gap-2"
            >
              <View style={{ width: DISC, height: DISC }}>
                <SmallDisc
                  art={art ?? null}
                  size={DISC}
                  active={active}
                  spinning={active && playing}
                />
                {active && (
                  <View className="absolute inset-0 items-center justify-center">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-canvas/70">
                      {loading ? (
                        <ActivityIndicator
                          size="small"
                          color={colours.violet[200]}
                        />
                      ) : playing ? (
                        <Pause
                          color={colours.textPrimary}
                          fill={colours.textPrimary}
                          size={14}
                        />
                      ) : (
                        <Play
                          color={colours.textPrimary}
                          fill={colours.textPrimary}
                          size={14}
                        />
                      )}
                    </View>
                  </View>
                )}
              </View>
              <Text
                className={`font-sans text-caption ${active ? "text-primary" : "text-muted"}`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
