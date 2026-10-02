import { Pressable, Text, View } from "react-native";
import { displayName, spokenName } from "@/data/notes";
import colours from "@/theme/colours";
import type { WeekDay } from "./useWeekSong";

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type Props = {
  days: readonly WeekDay[];
  /** The day whose bar is playing, highlighted. */
  current: number | null;
  onSelect: (day: number) => void;
};

/** One chip per day: its letter, its orb's colour and note. Tap to jump to that day in the song. */
export function DayChips({ days, current, onSelect }: Props) {
  return (
    <View className="w-full flex-row justify-between">
      {days.map((day, i) => {
        const active = i === current;
        const colour = day ? colours.orb[day.note][day.mode].core : null;
        return (
          <Pressable
            key={NAMES[i]}
            onPress={() => onSelect(i)}
            accessibilityRole="button"
            accessibilityLabel={`${NAMES[i]}, ${day ? spokenName(day.note, day.mode) : "no check-in"}`}
            accessibilityHint="Plays the song from this day"
            accessibilityState={{ selected: active }}
            className={`min-h-[64px] w-11 items-center justify-center gap-1.5 rounded-card border ${active ? "border-violet-500 bg-violet-700/40" : "border-transparent"}`}
          >
            <Text className={`font-sans-medium text-caption ${active ? "text-primary" : "text-muted"}`}>
              {LETTERS[i]}
            </Text>
            <View
              className="h-3.5 w-3.5 rounded-pill"
              style={
                colour
                  ? { backgroundColor: colour, shadowColor: colour, shadowOpacity: 0.9, shadowRadius: 6, elevation: 0 }
                  : { borderWidth: 1, borderColor: colours.textMuted }
              }
            />
            <Text className="font-mono text-caption text-secondary">
              {day ? displayName(day.note, day.mode) : " "}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}