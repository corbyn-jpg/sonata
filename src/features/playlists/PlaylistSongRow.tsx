import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Pause, Play, X } from "lucide-react-native";
import { INSTRUMENT_LABELS } from "@/audio";
import type { Composition } from "@/engine";
import { longDate } from "@/features/weekly/songTime";
import { fromDayKey } from "@/lib/dates";
import type { PlaylistSong } from "@/lib/playlistSongs";
import colours from "@/theme/colours";

type Props = {
  song: PlaylistSong;
  composition: Composition;
  /** This song is loaded (playing, paused or still being made). */
  active: boolean;
  playing: boolean;
  loading: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

/** One song in a playlist: a small record in the week's colours, its week and instrument, play and remove. */
export function PlaylistSongRow({ song, composition, active, playing, loading, onToggle, onRemove }: Props) {
  const [main, second] = composition.palette;
  const label = `Week of ${longDate(fromDayKey(song.week))}`;
  const days = song.days.filter(Boolean).length;
  const Icon = active && playing ? Pause : Play;

  return (
    <View
      className={`min-h-[64px] flex-row items-center gap-3 rounded-card border py-2 pl-3 ${active ? "border-violet-500 bg-violet-700/30" : "border-border bg-surface/60"}`}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${active && playing ? "Pause" : "Play"} ${label}, ${INSTRUMENT_LABELS[song.instrument]}`}
        className="flex-1 flex-row items-center gap-3"
      >
        {/* A tiny record: the week's main colour, a ring of its second, a dark centre */}
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colours.orb[main.note][main.mode].core,
            borderWidth: 3,
            borderColor: colours.orb[second.note][second.mode].core,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colours.canvas }} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="font-sans-medium text-body text-primary">
            {label}
          </Text>
          <Text className="font-sans text-caption text-muted">
            {INSTRUMENT_LABELS[song.instrument]} · {days === 1 ? "1 day" : `${days} days`}
          </Text>
        </View>
        {active && loading ? (
          <ActivityIndicator color={colours.violet[200]} />
        ) : (
          <Icon color={colours.textSecondary} fill={colours.textSecondary} size={18} strokeWidth={1.5} />
        )}
      </Pressable>
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label} from this playlist`}
        className="h-11 w-11 items-center justify-center"
      >
        <X color={colours.textMuted} size={18} strokeWidth={1.5} />
      </Pressable>
    </View>
  );
}