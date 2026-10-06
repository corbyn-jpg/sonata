import { useEffect, useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { BlurMask, Canvas, Circle, Group, Line, Path, Rect, Skia, vec } from "@shopify/react-native-skia";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import type { DayNote } from "@/engine";
import colours from "@/theme/colours";

const STAFF_WIDTH = 280;
const GAP = 11; // space between staff lines
const DRAW_MS = 2600; // the notes arrive over this long
// Staff steps above the bottom line, as on Home's staff: C sits on a ledger line below
const STEPS = { C: -2, D: -1, E: 0, F: 1, G: 2, A: 3, B: 4 } as const;

type Note = { x: number; y: number; colour: string; day: number };

/** One day's note: fades in and settles as the drawing reaches its day. */
function NoteHead({ note, progress }: { note: Note; progress: SharedValue<number> }) {
  const shown = useDerivedValue(() => Math.min(1, Math.max(0, (progress.value * 7 - note.day) * 1.5)));
  const centre = useDerivedValue(() => vec(note.x, note.y + (1 - shown.value) * 6));
  return (
    <Group opacity={shown}>
      <Circle c={centre} r={12} color={note.colour} opacity={0.35}>
        <BlurMask blur={8} style="normal" />
      </Circle>
      <Circle c={centre} r={4.5} color={note.colour} />
      <Circle c={centre} r={7.5} style="stroke" strokeWidth={1} color={note.colour} opacity={0.5} />
    </Group>
  );
}

type Props = {
  visible: boolean;
  /** The week, Monday first (null = no check-in). */
  days: readonly (DayNote | null)[];
};

/**
 "Composing": a quiet moment while the song is written. The week's notes arrive on a staff from Monday to Sunday, each in its orb's colour, and a fine line traces the melody through them.
 */
export function ComposingMoment({ visible, days }: Props) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const progress = useSharedValue(0);
  const cx = width / 2;
  const cy = height * 0.42;
  const left = cx - STAFF_WIDTH / 2;
  const bottom = cy + GAP; // keeps the notes (C on its ledger up to B) centred on the screen

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 700, easing: Easing.out(Easing.quad) });
    if (!visible) return;
    progress.value = reduceMotion ? 1 : 0;
    if (!reduceMotion) progress.value = withTiming(1, { duration: DRAW_MS, easing: Easing.inOut(Easing.quad) });
  }, [visible, reduceMotion, opacity, progress]);

  const notes = useMemo(
    () =>
      days.flatMap((day, i): Note[] =>
        day
          ? [{
              x: left + ((i + 0.5) * STAFF_WIDTH) / 7,
              y: bottom - (STEPS[day.note] * GAP) / 2,
              colour: colours.orb[day.note][day.mode].core,
              day: i,
            }]
          : [],
      ),
    [days, left, bottom],
  );

  // A smooth line through the notes, drawn as the notes arrive
  const melody = useMemo(() => {
    const path = Skia.PathBuilder.Make()
    notes.forEach(({ x, y }, i) => {
      if (i === 0) return path.moveTo(x, y);
      const prev = notes[i - 1];
      const mid = (prev.x + x) / 2;
      path.cubicTo(mid, prev.y, mid, y, x, y);
    });
    return path.build();
  }, [notes]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, fade]}
      pointerEvents={visible ? "auto" : "none"}
      accessibilityViewIsModal={visible}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={height} color={colours.canvas} opacity={0.97} />
        {[0, 1, 2, 3, 4].map((i) => (
          <Line
            key={i}
            p1={vec(left, bottom - i * GAP)}
            p2={vec(left + STAFF_WIDTH, bottom - i * GAP)}
            color={colours.violet[200]}
            opacity={0.16}
            strokeWidth={1}
          />
        ))}
        <Path path={melody} start={0} end={progress} style="stroke" strokeWidth={1} color={colours.textPrimary} opacity={0.35} />
        {notes.map((note) => (
          <NoteHead key={note.day} note={note} progress={progress} />
        ))}
        {/* A small tick for each day under the staff; missed days are fainter */}
        {days.map((day, i) => (
          <Line
            key={i}
            p1={vec(left + ((i + 0.5) * STAFF_WIDTH) / 7, bottom + GAP * 2)}
            p2={vec(left + ((i + 0.5) * STAFF_WIDTH) / 7, bottom + GAP * 2 + 4)}
            color={colours.textMuted}
            opacity={day ? 0.6 : 0.25}
            strokeWidth={1}
          />
        ))}
      </Canvas>

      <Text
        style={{ position: "absolute", top: bottom - GAP * 4 - 56, left: 24, right: 24, letterSpacing: 4 }}
        className="text-center font-mono text-caption uppercase text-muted"
      >
        Composing
      </Text>
      <View style={{ position: "absolute", top: bottom + GAP * 2 + 36, left: 24, right: 24 }}>
        <Text className="text-center font-sans text-body text-secondary" accessibilityLiveRegion="polite">
          Your week, as one melody
        </Text>
      </View>
    </Animated.View>
  );
}