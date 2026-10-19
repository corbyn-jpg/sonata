import { useEffect, useState } from "react";
import { useIsFocused } from "expo-router";
import {
  AccessibilityInfo,
  Alert,
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
import { Screen } from "@/components/Screen";
import { TabHeader } from "@/components/TabHeader";
import { PopupTip } from "@/components/Tooltip";
import { Sky } from "@/components/Sky";
import { LETTERS, type Letter, type Mode } from "@/data/notes";
import { ModeToggle } from "@/features/home/ModeToggle";
import { OrbCarousel } from "@/features/home/OrbCarousel";
import { useWeek } from "@/features/home/useWeek";
import { WeekStrip } from "@/features/home/WeekStrip";
import { forgetTodaysCheckin, saveCheckin } from "@/lib/checkins";
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
  // The toggle's position (0 = major, 1 = minor); the sky pauses while another tab is showing
  const page = useSharedValue(0);
  const isFocused = useIsFocused();
  const position = useSharedValue(START_INDEX);
  const [focused, setFocused] = useState(START_INDEX);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [reflection, setReflection] = useState("");
  // Success is silent (the dot appears and the button says so); only a failure gets a message
  const [status, setStatus] = useState<"idle" | "error" | "changeFailed">(
    "idle",
  );
  const [changing, setChanging] = useState(false); // today's check-in is being removed
  const { days, todayIndex, todayLogged, loaded, logToday } = useWeek();
  const feelNotes = usePreference("feelNotes");
  const instrument = usePreference("instrument");

  // Load the chosen instrument's sounds now, so the first swipe plays without a delay
  useEffect(() => preloadChords(instrument), [instrument]);

  // The wash follows the carousel and crossfades (and dims) to the minor palette with the toggle
  const glow = useDerivedValue(() => {
    const bright = interpolateColors(position.value, INDICES, MAJOR_CORES);
    const dark = interpolateColors(position.value, INDICES, MINOR_CORES);
    const t = page.value;
    return [
      bright[0] + (dark[0] - bright[0]) * t,
      bright[1] + (dark[1] - bright[1]) * t,
      bright[2] + (dark[2] - bright[2]) * t,
      1 - 0.35 * t, // dimmer in minor
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
    setStatus("idle");
    AccessibilityInfo.announceForAccessibility("Check-in saved"); // sighted users see the dot and the button change
    setSelected(null);
    setReflection("");
    // Not awaited: the check-in is saved on the phone and uploaded in the background
    saveCheckin(selected, mode, instrument, reflection).catch(() => {
      logToday(null);
      setStatus("error");
    });
  };

  /** Remove today's check-in so the day can be chosen again. It can't be brought back, so it asks first. */
  const changeToday = () =>
    Alert.alert(
      "Change today's note?",
      "Today's check-in is removed, so you can choose again.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Change",
          onPress: async () => {
            setChanging(true);
            try {
              await forgetTodaysCheckin();
              logToday(null); // the dot clears; pick an orb again
              setStatus("idle");
              AccessibilityInfo.announceForAccessibility(
                "Today's check-in removed. Choose again.",
              );
            } catch {
              setStatus("changeFailed");
            } finally {
              setChanging(false);
            }
          },
        },
      ],
    );

  return (
    <Screen
      background={
        <Sky
          glow={glow}
          animated={isFocused}
          pace={mode === "minor" ? 1.6 : 1} // calmer stars in minor
        />
      }
      header={
        <TabHeader title={greeting()} className="gap-4">
          <View className="flex-row items-center justify-center gap-3">
            <ModeToggle mode={mode} onChange={onModeChange} />
            <PopupTip
              label="About Major and Minor"
              text="Major plays each orb as a major chord. Minor plays it as a minor chord, which sounds darker, and lowers E, A and B to E♭, A♭ and B♭."
            />
            <InstrumentPicker
              instrument={instrument}
              onChange={onInstrumentChange}
            />
          </View>
        </TabHeader>
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
            className={`h-12 rounded-card border border-field bg-surface/60 px-4 font-sans text-body text-primary ${todayLogged ? "opacity-40" : ""}`}
          />
          <Pressable
            onPress={onSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            className={`min-h-[52px] items-center justify-center rounded-pill bg-violet-700 ${canSave ? "" : "opacity-40"}`}
          >
            <Text className="font-sans-bold text-body text-primary">
              {todayLogged ? "Checked in for today" : "Save check-in"}
            </Text>
          </Pressable>
          {/* A failure, or once checked in, the way to choose again. Same height either way, so the orb doesn't move. */}
          {todayLogged && status === "idle" ? (
            <Pressable
              onPress={changeToday}
              disabled={changing}
              hitSlop={12} // a 44 pt target without taking more room
              accessibilityRole="button"
              accessibilityState={{ disabled: changing, busy: changing }}
              accessibilityHint="Removes today's check-in so you can choose again"
              className={`h-5 items-center justify-center active:opacity-60 ${changing ? "opacity-40" : ""}`}
            >
              <Text className="font-sans-medium text-caption text-secondary">
                Change today&apos;s note
              </Text>
            </Pressable>
          ) : (
            <Text
              accessibilityLiveRegion="polite"
              className="h-5 text-center font-sans text-caption text-secondary"
            >
              {status === "error"
                ? "Couldn't save. Check your connection."
                : status === "changeFailed"
                  ? "Couldn't change today's note. Please try again."
                  : ""}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
