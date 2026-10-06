import { useEffect, useState } from "react";
import { Link, useIsFocused } from "expo-router";
import {
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { interpolateColors } from "@shopify/react-native-skia";
import { FileMusic, Settings } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Sky } from "@/components/Sky";
import { LETTERS, type Letter, type Mode } from "@/data/notes";
import { ModeToggle } from "@/features/home/ModeToggle";
import { OrbCarousel } from "@/features/home/OrbCarousel";
import { useWeek } from "@/features/home/useWeek";
import { WeekStrip } from "@/features/home/WeekStrip";
import { saveCheckin } from "@/lib/checkins";
import colours from "@/theme/colours";
import * as Haptics from "expo-haptics";
import { feelNote } from "@/haptics";
import { setPreference, usePreference } from "@/lib/preferences";
import {
  chooseNote,
  playChime,
  preloadChords,
  previewNote,
  type Instrument,
} from "@/audio";
import { InstrumentPicker } from "@/features/home/InstrumentPicker";

const START_INDEX = 3; // F — middle of the scale, so there's a neighbour on each side
const INDICES = LETTERS.map((_, i) => i);
const MAJOR_CORES = LETTERS.map((l) => colours.orb[l].major.core);
const MINOR_CORES = LETTERS.map((l) => colours.orb[l].minor.core);

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("major");
  const page = useSharedValue(0); // 0 = Bright, 1 = Dark
  const isFocused = useIsFocused(); // pause the sky while another tab is showing
  const position = useSharedValue(START_INDEX);
  const [focused, setFocused] = useState(START_INDEX);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [reflection, setReflection] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const { days, todayIndex, todayLogged, loaded, logToday } = useWeek();
  const feelNotes = usePreference("feelNotes");
  const instrument = usePreference("instrument");

  // Load the chosen instrument's sounds now, so the first swipe plays without a delay
  useEffect(() => preloadChords(instrument), [instrument]);

  // Wash colour follows the carousel, and crossfades to the Dark palette (and dims) with the toggle
  const glow = useDerivedValue(() => {
    const bright = interpolateColors(position.value, INDICES, MAJOR_CORES);
    const dark = interpolateColors(position.value, INDICES, MINOR_CORES);
    const t = page.value;
    return [
      bright[0] + (dark[0] - bright[0]) * t,
      bright[1] + (dark[1] - bright[1]) * t,
      bright[2] + (dark[2] - bright[2]) * t,
      1 - 0.35 * t, // dimmer wash on the Dark page
    ];
  });

  const canSave = loaded && !todayLogged && selected !== null;

  const onFocusChange = (index: number) => {
    setFocused(index);
    setSelected(null); // the selected orb is always the centred one
    previewNote(LETTERS[index], mode, instrument);
    if (feelNotes) feelNote(LETTERS[index], mode);
    else Haptics.selectionAsync();
  };

  const onSelect = (letter: Letter) => {
    setSelected(letter);
    setStatus("idle");
    chooseNote(letter, mode, instrument);
    if (feelNotes) feelNote(letter, mode);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const onModeChange = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setSelected(null);
    setStatus("idle");
    page.set(
      withTiming(next === "minor" ? 1 : 0, {
        duration: 600,
        easing: Easing.inOut(Easing.quad),
      }),
    );
    previewNote(LETTERS[focused], next, instrument);
    if (feelNotes) feelNote(LETTERS[focused], next);
    else Haptics.selectionAsync();
  };

  const onInstrumentChange = (next: Instrument) => {
    setPreference("instrument", next);
    previewNote(LETTERS[focused], mode, next); // hear the new instrument straight away
    Haptics.selectionAsync();
  };

  const onSave = () => {
    if (!canSave || !selected) return;
    logToday({ note: selected, mode }); // show the dot now
    playChime("save");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStatus("saved");
    setSelected(null);
    setReflection("");
    // addDoc only resolves once the server confirms, so don't wait on it (offline writes are queued)
    saveCheckin(selected, mode, instrument, reflection).catch(() => {
      logToday(null);
      setStatus("error");
    });
  };

  return (
    <Screen
      background={
        <Sky
          glow={glow}
          animated={isFocused}
          pace={mode === "minor" ? 1.6 : 1} // calmer stars on the Dark page
        />
      }
      header={
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text
              numberOfLines={1}
              className="shrink font-mono-medium text-h3 text-primary"
            >
              {greeting()}
            </Text>
            <View className="flex-row items-center">
              <Link href="/composer" asChild>
                <Pressable
                  accessibilityLabel="Open composer"
                  className="h-11 w-11 items-center justify-center"
                >
                  <FileMusic
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
          <View className="flex-row items-center justify-center gap-3">
            <ModeToggle mode={mode} onChange={onModeChange} />
            <InstrumentPicker
              instrument={instrument}
              onChange={onInstrumentChange}
            />
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
            page={page}
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
