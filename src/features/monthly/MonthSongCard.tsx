import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  PixelRatio,
  Pressable,
  Text,
  View,
} from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useIsFocused } from "expo-router";
import { Pause, Play } from "lucide-react-native";
import { INSTRUMENT_LABELS, mostUsedInstrument } from "@/audio/instruments";
import { songSeconds } from "@/audio/mixer";
import { renderSong } from "@/audio/song";
import { takeTurn } from "@/audio/turns";
import { BentoCard } from "@/components/BentoCard";
import { composeMonth, type DayNote } from "@/engine";
import { hashString } from "@/engine/random";
import { clock } from "@/features/weekly/songTime";
import { dayKey } from "@/lib/dates";
import colours from "@/theme/colours";
import { makeMonthArt } from "./disc/monthArt";
import { daysOfMonth, monthName, type MonthWeek } from "./month";
import { SmallDisc } from "./SmallDisc";

const DISC = 80;
const ART_PX = Math.round(DISC * PixelRatio.get()); // the art's size in real pixels

type Props = {
  month: Date;
  /** Each day's check-in, by day key (for the beads round the record's rim). */
  days: ReadonlyMap<string, DayNote>;
  weeks: readonly MonthWeek[];
};

/**
 The month's song: every week with a song, joined into one piece (composeMonth). It's made the first time it's played (a few seconds, as it's several weeks long), then kept, so it plays straight away after that.
 */
export function MonthSongCard({ month, days, weeks }: Props) {
  const withSongs = useMemo(
    () => weeks.filter((w) => w.mode !== null),
    [weeks],
  );
  const song = useMemo(
    () =>
      composeMonth(
        withSongs.map((w) => ({ week: w.days, seed: dayKey(w.start) })),
        dayKey(month),
      ),
    [withSongs, month],
  );
  // Its own record: the month's moon phases, one moon per week
  const art = useMemo(
    () =>
      makeMonthArt(
        daysOfMonth(days, month),
        weeks.map((w) => w.days),
        ART_PX,
        dayKey(month),
      ),
    [days, weeks, month],
  );
  const instrument =
    mostUsedInstrument(withSongs.map((w) => w.instrument)) ?? "piano";
  // The file name changes whenever the month's notes do, so a new check-in makes a new song
  const name = `month-${dayKey(month)}-${hashString(JSON.stringify(withSongs.map((w) => w.days))).toString(36)}`;

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const isFocused = useIsFocused();
  const [loaded, setLoaded] = useState<string | null>(null); // the file name the player holds
  const [making, setMaking] = useState(false);

  useEffect(() => {
    if (!isFocused) player.pause();
  }, [isFocused, player]);

  const toggle = async () => {
    if (making) return;
    if (status.playing) return player.pause();
    takeTurn(player, () => player.pause());
    if (loaded === `${name}-${instrument}`) {
      if (status.duration > 0 && status.currentTime >= status.duration - 0.05)
        player.seekTo(0); // finished: start again
      return player.play();
    }
    setMaking(true);
    try {
      // Mixing holds up the app for a few seconds, so let "Joining your weeks…" appear first
      await new Promise((resolve) => setTimeout(resolve, 50));
      const file = await renderSong(song, instrument, name);
      player.replace({ uri: file.uri });
      setLoaded(`${name}-${instrument}`);
      player.play();
    } catch (error) {
      console.warn("Couldn't make the month's song:", error);
    } finally {
      setMaking(false);
    }
  };

  const [main, second] = song.palette; // the card's corner glow
  const title = `${monthName(month)}'s song`;
  const weeksText =
    withSongs.length === 1 ? "1 week" : `${withSongs.length} weeks`;

  return (
    <BentoCard
      glow={[
        colours.orb[main.note][main.mode].core,
        colours.orb[second.note][second.mode].core,
      ]}
    >
      <View className="flex-row items-center gap-4">
        <SmallDisc
          art={art}
          size={DISC}
          active={loaded !== null}
          spinning={status.playing}
        />
        <View className="flex-1 gap-0.5">
          <Text className="font-mono-medium text-h4 text-primary">{title}</Text>
          <Text className="font-sans text-caption text-muted">
            {making
              ? "Joining your weeks…"
              : `${weeksText} as one piece · ${INSTRUMENT_LABELS[instrument]} · ${clock(songSeconds(song))}`}
          </Text>
        </View>
        <Pressable
          onPress={toggle}
          disabled={making}
          accessibilityRole="button"
          accessibilityLabel={`${status.playing ? "Pause" : "Play"} ${title}`}
          accessibilityState={{ busy: making }}
          className="h-12 w-12 items-center justify-center rounded-full bg-violet-700"
        >
          {making ? (
            <ActivityIndicator color={colours.textPrimary} />
          ) : status.playing ? (
            <Pause
              color={colours.textPrimary}
              fill={colours.textPrimary}
              size={18}
            />
          ) : (
            <Play
              color={colours.textPrimary}
              fill={colours.textPrimary}
              size={18}
            />
          )}
        </Pressable>
      </View>
    </BentoCard>
  );
}
