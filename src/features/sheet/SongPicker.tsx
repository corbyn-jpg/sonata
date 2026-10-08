import { useState } from "react";
import { Modal, Pressable, ScrollView, Text } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { INSTRUMENT_LABELS } from "@/audio";
import colours from "@/theme/colours";
import type { MonthSong, SongChoice, WeekSong } from "./songs";

type Props = {
  weeks: readonly WeekSong[];
  months: readonly MonthSong[];
  selected: SongChoice;
  onChange: (song: SongChoice) => void;
};

/** The chosen song as a pill; opens a sheet of every week and month to choose another. */
export function SongPicker({ weeks, months, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const choose = (song: SongChoice) => {
    setOpen(false);
    onChange(song);
  };

  const option = (song: SongChoice) => {
    const active = song.key === selected.key;
    return (
      <Pressable
        key={song.key}
        onPress={() => choose(song)}
        accessibilityRole="radio"
        accessibilityState={{ checked: active }}
        accessibilityLabel={song.title}
        className={`min-h-[52px] flex-row items-center gap-3 rounded-card px-3 ${active ? "bg-violet-700/40" : ""}`}
      >
        <Text className="flex-1 font-sans text-body text-primary">{song.title}</Text>
        <Text className="font-sans text-caption text-muted">{INSTRUMENT_LABELS[song.instrument]}</Text>
        {active && <Check color={colours.violet[200]} size={20} strokeWidth={1.5} />}
      </Pressable>
    );
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Song: ${selected.title}`}
        accessibilityHint="Choose which song to show as sheet music"
        className="min-h-[48px] flex-row items-center gap-2 self-start rounded-pill border border-border bg-surface/60 px-4"
      >
        <Text className="font-sans-medium text-body text-primary">{selected.title}</Text>
        <ChevronDown color={colours.textMuted} size={16} strokeWidth={1.5} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        {/* Tapping outside the sheet closes it */}
        <Pressable className="flex-1 justify-end bg-canvas/70" onPress={() => setOpen(false)} accessibilityLabel="Close">
          <Pressable onPress={() => {}} className="max-h-[75%] rounded-t-card border border-border bg-surface-raised pt-5">
            <ScrollView contentContainerClassName="gap-1 px-5 pb-12" accessibilityRole="radiogroup">
              <Text className="mb-1 px-2 font-mono-medium text-h4 text-primary">Weeks</Text>
              {weeks.map(option)}
              {months.length > 0 && (
                <Text className="mb-1 mt-5 px-2 font-mono-medium text-h4 text-primary">Months</Text>
              )}
              {months.map(option)}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
