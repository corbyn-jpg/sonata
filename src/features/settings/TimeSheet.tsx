import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { timeLabel } from "@/lib/reminder";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const two = (n: number) => String(n).padStart(2, "0");

type Props = {
  /** The current time, in minutes after midnight. */
  minutes: number;
  onDone: (minutes: number) => void;
  onClose: () => void;
};

/**
 Pick the reminder time: an hour, then a minute (in fives), so any time is two taps away. Mount it only while it's open, so it starts from the current time each time.
 */
export function TimeSheet({ minutes, onDone, onClose }: Props) {
  const [hour, setHour] = useState(Math.floor(minutes / 60));
  const [minute, setMinute] = useState(minutes % 60 - ((minutes % 60) % 5));

  const chip = (value: number, active: boolean, onPress: () => void, label: string) => (
    <Pressable
      key={value}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      className={`h-11 w-[14.5%] items-center justify-center rounded-pill ${active ? "bg-violet-700" : "border border-border"}`}
    >
      <Text className={`font-mono-medium text-body ${active ? "text-primary" : "text-secondary"}`}>{two(value)}</Text>
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* Tapping outside the sheet closes it */}
      <Pressable className="flex-1 justify-end bg-canvas/70" onPress={onClose} accessibilityLabel="Close">
        <Pressable onPress={() => {}} className="gap-5 rounded-t-card border border-border bg-surface-raised px-6 pb-12 pt-6">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-mono-medium text-h4 text-primary">Remind me at</Text>
            <Text className="font-mono-medium text-h2 text-violet-200" accessibilityLiveRegion="polite">
              {timeLabel(hour * 60 + minute)}
            </Text>
          </View>

          <View className="gap-2">
            <Text className="font-sans-medium text-caption text-secondary">Hour</Text>
            <View className="flex-row flex-wrap justify-between gap-y-2" accessibilityRole="radiogroup">
              {HOURS.map((h) => chip(h, h === hour, () => setHour(h), `${h} o'clock`))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="font-sans-medium text-caption text-secondary">Minute</Text>
            <View className="flex-row flex-wrap justify-between gap-y-2" accessibilityRole="radiogroup">
              {MINUTES.map((m) => chip(m, m === minute, () => setMinute(m), `${m} minutes past`))}
            </View>
          </View>

          <Pressable
            onPress={() => onDone(hour * 60 + minute)}
            accessibilityRole="button"
            className="min-h-[52px] items-center justify-center rounded-pill bg-violet-700 active:opacity-80"
          >
            <Text className="font-sans-bold text-body text-primary">Set time</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}