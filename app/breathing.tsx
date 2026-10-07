import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useFocusEffect, useIsFocused } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  runOnJS,
  useAnimatedReaction,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";
import { playChime } from "@/audio";
import { BackHeader } from "@/components/BackHeader";
import { Screen } from "@/components/Screen";
import { BREATHING_SIZE, BreathingOrb } from "@/features/oasis/BreathingOrb";
import { breathAt, CYCLES, EXHALE, INHALE, stepOf, type BreathPhase } from "@/features/oasis/breathing";

type Session = "ready" | "running" | "paused" | "done";

const LABEL: Record<BreathPhase, string> = { in: "Breathe in", out: "Breathe out", done: "Finished" };

/**
 Breathing space: six slow breaths with a glowing orb. A glockenspiel chime and a light tap mark each change, so it can be followed with eyes closed. Also where "Grounding ritual" on the low-mood offer leads.
 */
export default function Breathing() {
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const [session, setSession] = useState<Session>("ready");
  const [breath, setBreath] = useState<{ cycle: number; phase: BreathPhase }>({ cycle: 1, phase: "in" });
  const elapsed = useSharedValue(0); // seconds into the session; only moves while running

  const frame = useFrameCallback((info) => {
    elapsed.set(elapsed.get() + (info.timeSincePreviousFrame ?? 16) / 1000);
  }, false);
  useEffect(() => {
    frame.setActive(session === "running" && isFocused);
  }, [session, isFocused, frame]);

  // Leaving the screen pauses the session rather than letting it run on unseen
  useFocusEffect(
    useCallback(() => () => setSession((s) => (s === "running" ? "paused" : s)), []),
  );

  // Each change of phase: chime, tap, and the new words
  const onStep = (step: number) => {
    if (step === -1) {
      setSession("done");
      setBreath({ cycle: CYCLES, phase: "done" });
      playChime("finish", 0.7);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    const phase = step % 2 === 0 ? "in" : "out";
    setBreath({ cycle: Math.floor(step / 2), phase });
    playChime(phase === "in" ? "breatheIn" : "breatheOut", 0.6);
    Haptics.selectionAsync();
  };
  useAnimatedReaction(
    () => stepOf(breathAt(elapsed.get())),
    (step, previous) => {
      if (previous !== null && step !== previous) runOnJS(onStep)(step);
    },
  );

  const begin = () => {
    elapsed.set(0);
    setBreath({ cycle: 1, phase: "in" });
    setSession("running");
    // After a finished session, resetting the clock already counts as a new phase (and chimes)
    if (session !== "done") {
      playChime("breatheIn", 0.6);
      Haptics.selectionAsync();
    }
  };

  const label = session === "ready" ? "Breathe" : LABEL[breath.phase];
  const caption =
    session === "ready"
      ? `${CYCLES} slow breaths: in for ${INHALE}, out for ${EXHALE}.`
      : session === "done"
        ? `${CYCLES} breaths, done.`
        : `Breath ${breath.cycle} of ${CYCLES}${session === "paused" ? " · paused" : ""}`;

  return (
    <Screen header={<BackHeader title="Breathing space" />}>
      <View className="flex-1 items-center justify-between pb-20">
        <View className="flex-1 items-center justify-center ">
          <View style={{ width: BREATHING_SIZE, height: BREATHING_SIZE }}>
            <BreathingOrb elapsed={elapsed} still={reduceMotion} />
            <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
              {/* The one place a word sits on an orb: it's an instruction, not a label */}
              <Text className="font-mono-medium text-h4 text-primary" accessibilityLiveRegion="polite">
                {label}
              </Text>
            </View>
          </View>
          <Text className="font-mono text-body text-secondary">{caption}</Text>
        </View>

        <View className="w-full gap-3">
          <Text className="text-center font-sans text-caption text-muted">
            A chime marks each change, so you can breathe with your eyes closed.
          </Text>
          {session === "done" ? (
            <View className="flex-row gap-3">
              <Pressable
                onPress={begin}
                accessibilityRole="button"
                className="min-h-[52px] flex-1 items-center justify-center rounded-pill border border-violet-500"
              >
                <Text className="font-sans-bold text-body text-primary">Again</Text>
              </Pressable>
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                className="min-h-[52px] flex-1 items-center justify-center rounded-pill bg-violet-700"
              >
                <Text className="font-sans-bold text-body text-primary">Done</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() =>
                session === "ready" ? begin() : setSession(session === "running" ? "paused" : "running")
              }
              accessibilityRole="button"
              className={`min-h-[52px] items-center justify-center rounded-pill ${session === "ready" ? "bg-violet-700" : "border border-violet-500"}`}
            >
              <Text className="font-sans-bold text-body text-primary">
                {session === "ready" ? "Begin" : session === "running" ? "Pause" : "Carry on"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Screen>
  );
}