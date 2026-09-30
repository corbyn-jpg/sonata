import { useMemo, useState } from "react";
import { Link, useIsFocused } from "expo-router";
import {
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import { interpolateColors } from "@shopify/react-native-skia";
import { Music2, Piano, Settings } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Sky } from "@/components/Sky";
import { LETTERS, type Letter, type Mode } from "@/data/notes";
import { OrbCarousel } from "@/features/home/OrbCarousel";
import { useWeek } from "@/features/home/useWeek";
import { WeekStrip } from "@/features/home/WeekStrip";
import { saveCheckin } from "@/lib/checkins";
import colours from "@/theme/colours";
import * as Haptics from "expo-haptics";
import { chooseNote, previewNote } from "@/audio";

const START_INDEX = 3; // F — middle of the scale, so there's a neighbour on each side
const INDICES = LETTERS.map((_, i) => i);

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Home() {
  const mode: Mode = "major"; // Bright/Dark pages come later
  const isFocused = useIsFocused(); // pause the sky while another tab is showing
  const position = useSharedValue(START_INDEX);
  const [focused, setFocused] = useState(START_INDEX);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [reflection, setReflection] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const { days, todayIndex, todayLogged, streak, loaded, logToday } = useWeek();

  // The wash blends between orb colours as the carousel moves, on the UI thread
  const cores = useMemo(
    () => LETTERS.map((l) => colours.orb[l][mode].core),
    [mode],
  );
  const glow = useDerivedValue(() =>
    interpolateColors(position.value, INDICES, cores),
  );

  const canSave = loaded && !todayLogged && selected !== null;

    const onFocusChange = (index: number) => {
    setFocused(index);
    setSelected(null); // the selected orb is always the centred one
    previewNote(LETTERS[index], mode);
    Haptics.selectionAsync();
  };

  const onSelect = (letter: Letter) => {
    setSelected(letter);
    setStatus("idle");
    chooseNote(letter, mode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const onSave = () => {
    if (!canSave || !selected) return;
    logToday({ note: selected, mode }); // show the dot now
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStatus("saved");
    setSelected(null);
    setReflection("");
    // addDoc only resolves once the server confirms, so don't wait on it (offline writes are queued)
    saveCheckin(selected, mode, reflection).catch(() => {
      logToday(null);
      setStatus("error");
    });
  };

  return (
    <Screen
      background={<Sky glow={glow} animated={isFocused} />}
      header={
        <View className="flex-row items-center justify-between">
          <Text
            numberOfLines={1}
            className="shrink font-mono-medium text-h3 text-primary"
          >
            {greeting()}
          </Text>
          <View className="flex-row items-center">
            {/* No pill at 0*/}
            {streak > 0 && (
              <View
                accessible
                accessibilityLabel={`${streak}-day streak`}
                className="mr-1 h-8 flex-row items-center gap-1 rounded-pill border border-border px-3"
              >
                <Music2
                  color={colours.textSecondary}
                  size={14}
                  strokeWidth={1.5}
                />
                <Text className="font-sans-medium text-caption text-secondary">
                  {streak}
                </Text>
              </View>
            )}
            <Link href="/composer" asChild>
              <Pressable
                accessibilityLabel="Open composer"
                className="h-11 w-11 items-center justify-center"
              >
                <Piano
                  color={colours.textSecondary}
                  size={24}
                  strokeWidth={1.5}
                />
              </Pressable>
            </Link>
            <Link href="/settings" asChild>
              <Pressable
                accessibilityLabel="Settings"
                className="h-11 w-11 items-center justify-center"
              >
                <Settings
                  color={colours.textSecondary}
                  size={24}
                  strokeWidth={1.5}
                />
              </Pressable>
            </Link>
          </View>
        </View>
      }
    >
      {/* Keeps the reflection input above the keyboard */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        {/* Full-bleed and flex-1: the orb sits centred in the space, and you can swipe anywhere in it */}
        <View className="-mx-6 flex-1">
          <OrbCarousel
            mode={mode}
            position={position}
            focused={focused}
            onFocusChange={onFocusChange}
            selected={selected}
            onSelect={onSelect}
            animated={isFocused}
          />
        </View>

        <View className="gap-4 pb-6">
          <WeekStrip days={days} todayIndex={todayIndex} />
          <TextInput
            value={reflection}
            onChangeText={setReflection}
            editable={!todayLogged}
            placeholder="What's on your mind? (optional)"
            placeholderTextColor={colours.textMuted}
            maxLength={140}
            returnKeyType="done"
            className={`h-12 rounded-card border border-border bg-surface/60 px-4 font-sans text-body text-primary ${todayLogged ? "opacity-40" : ""}`}
          />
          <Pressable
            onPress={onSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            className={`min-h-[52px] items-center justify-center rounded-pill bg-violet-700 ${canSave ? "" : "opacity-40"}`}
          >
            <Text className="font-sans-bold text-body text-white">
              {todayLogged ? "Checked in for today" : "Save check-in"}
            </Text>
          </Pressable>
          <Text
            accessibilityLiveRegion="polite"
            className={`h-5 text-center font-sans text-caption ${status === "error" ? "text-secondary" : "text-teal-300"}`}
          >
            {status === "saved"
              ? "Check-in saved"
              : status === "error"
                ? "Couldn't save. Check your connection."
                : ""}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}