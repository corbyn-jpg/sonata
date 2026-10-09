import { useEffect, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { BEATS_PER_BAR } from "@/engine";
import {
  displayName,
  LETTERS,
  spokenName,
  type Letter,
  type Mode,
} from "@/data/notes";
import colours from "@/theme/colours";

const ROWS = [...LETTERS].reverse(); // the highest note at the top, as on a staff
const CELL = 44; // the minimum tap target
const GAP = 4;
const BAR_GAP = 12; // a wider gap before each new bar, so the four bars read at a glance

type Props = {
  steps: readonly (Letter | null)[];
  mode: Mode;
  /** The step being played, or null. */
  playing: number | null;
  onToggle: (step: number, letter: Letter) => void;
};

/** Where a step's column starts, from the left of the scrolling area. */
const columnX = (step: number) =>
  step * (CELL + GAP) + Math.floor(step / BEATS_PER_BAR) * (BAR_GAP - GAP);

/**
 The Composer's grid: a row per note (letters are fine here: this is explicit music-making), a column per beat.
 One note per beat. A placed note shows its orb's two colours, flat: core inside, edge as the outline.
 */
export function NoteGrid({ steps, mode, playing, onToggle }: Props) {
  const scroller = useRef<ScrollView>(null);

  // Keep the playhead in view while the piece plays
  useEffect(() => {
    if (playing !== null)
      scroller.current?.scrollTo({
        x: Math.max(0, columnX(playing) - 2 * (CELL + GAP)),
        animated: true,
      });
  }, [playing]);

  return (
    <View className="flex-row gap-2">
      {/* Note names, fixed while the beats scroll */}
      <View className="gap-1 pt-6">
        {ROWS.map((letter) => (
          <View
            key={letter}
            className="w-7 items-end justify-center"
            style={{ height: CELL }}
            importantForAccessibility="no-hide-descendants"
          >
            <Text className="font-mono text-caption text-secondary">
              {displayName(letter, mode)}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 24 }}
      >
        {steps.map((placed, step) => {
          const barStart = step % BEATS_PER_BAR === 0;
          const now = step === playing;
          return (
            <View
              key={step}
              className="gap-1"
              style={{ marginLeft: step === 0 ? 0 : barStart ? BAR_GAP : GAP }}
            >
              {/* Bar number over each bar's first beat */}
              <Text
                className="h-5 font-sans text-caption text-muted"
                importantForAccessibility="no"
              >
                {barStart ? step / BEATS_PER_BAR + 1 : ""}
              </Text>
              {ROWS.map((letter) => {
                const on = placed === letter;
                const orb = colours.orb[letter][mode];
                return (
                  <Pressable
                    key={letter}
                    onPress={() => onToggle(step, letter)}
                    accessibilityRole="button"
                    accessibilityLabel={`${spokenName(letter, mode)}, beat ${step + 1}`}
                    accessibilityState={{ selected: on }}
                    className={`rounded-lg ${on ? "" : now ? "bg-violet-700/40" : "bg-surface"}`}
                    style={[
                      { width: CELL, height: CELL },
                      on && {
                        backgroundColor: orb.core,
                        borderColor: orb.edge,
                        borderWidth: 2,
                      },
                    ]}
                  />
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
