import { useEffect } from "react";
import { View, type AccessibilityActionEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Image,
  LinearGradient,
  Path,
  Skia,
  vec,
  type SkImage,
} from "@shopify/react-native-skia";
import {
  runOnJS,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";
import colours from "@/theme/colours";
import { clock } from "./songTime";

const DISC = 220;
const RING = DISC / 2 + 14; // progress ring radius, just outside the disc
const SIZE = 2 * (RING + 40); // room for the ring's glow and the knob
const C = SIZE / 2;
const SPIN = (2 * Math.PI) / 40; // one turn every 40 s while playing
const GRAB = 32; // how far from the ring a touch still counts as grabbing it
// The progress ring, drawn once: a full circle starting at 12 o'clock
const RING_PATH = Skia.PathBuilder.Make()
  .addArc(Skia.XYWHRect(C - RING, C - RING, 2 * RING, 2 * RING), -90, 359.9)
  .build();

/** Touch position → how far through the song (12 o'clock = start, clockwise). */
function progressAt(x: number, y: number) {
  "worklet";
  const a = Math.atan2(y - C, x - C) + Math.PI / 2;
  return (a < 0 ? a + 2 * Math.PI : a) / (2 * Math.PI);
}

type Props = {
  art: SkImage | null;
  /** Glow colour behind the disc. */
  glow: string;
  playing: boolean;
  /** Seconds, from the player (it reports a few times a second). */
  currentTime: number;
  duration: number;
  /** Paused screens shouldn't keep a frame loop running. */
  active: boolean;
  onSeek: (seconds: number) => void;
};

/**
 The week's record. Spins while playing and eases to a stop on pause. The ring round it shows how far through the song you are; drag along it (or tap it) to jump.
 */
export function SongDisc({
  art,
  glow,
  playing,
  currentTime,
  duration,
  active,
  onSeek,
}: Props) {
  const reduceMotion = useReducedMotion();
  const angle = useSharedValue(0);
  const speed = useSharedValue(0);
  const spinning = useSharedValue(false);
  const advancing = useSharedValue(false);
  const progress = useSharedValue(0);
  const total = useSharedValue(0);
  const scrubbing = useSharedValue(false);

  useEffect(() => {
    advancing.set(playing);
    spinning.set(playing && !reduceMotion); // with Reduce Motion on, the disc stays still
  }, [playing, reduceMotion, advancing, spinning]);

  useEffect(() => {
    total.set(duration);
  }, [duration, total]);

  // The player reports coarsely; between reports the ring moves on by itself, so only correct it when it has drifted (or after a seek)
  useEffect(() => {
    if (scrubbing.get() || duration <= 0) return;
    const reported = Math.min(1, currentTime / duration);
    if (!playing || Math.abs(reported - progress.get()) > 0.015)
      progress.set(reported);
  }, [currentTime, duration, playing, progress, scrubbing]);

  const frame = useFrameCallback((info) => {
    const dt = (info.timeSincePreviousFrame ?? 16) / 1000;
    // Ease the spin up and down rather than starting and stopping dead
    const target = spinning.get() ? SPIN : 0;
    speed.set(speed.get() + (target - speed.get()) * Math.min(1, dt * 1.5));
    angle.set((angle.get() + speed.get() * dt) % (2 * Math.PI));
    if (advancing.get() && !scrubbing.get() && total.get() > 0)
      progress.set(Math.min(1, progress.get() + dt / total.get()));
  }, false);

  useEffect(() => {
    frame.setActive(active);
  }, [active, frame]);

  const rotation = useDerivedValue(() => [{ rotate: angle.value }]);

  const knob = useDerivedValue(() => {
    const a = -Math.PI / 2 + progress.value * 2 * Math.PI;
    return vec(C + Math.cos(a) * RING, C + Math.sin(a) * RING);
  });

  // Rebuilt on each render, so it always seeks with the latest callback and duration
  const seek = (fraction: number) => onSeek(fraction * duration);
  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      // Only touches near the ring scrub; the rest of the disc is just a picture
      if (Math.abs(Math.hypot(e.x - C, e.y - C) - RING) > GRAB) return;
      scrubbing.set(true);
      progress.set(progressAt(e.x, e.y));
    })
    .onUpdate((e) => {
      if (scrubbing.get()) progress.set(progressAt(e.x, e.y));
    })
    .onFinalize(() => {
      if (!scrubbing.get()) return;
      scrubbing.set(false);
      runOnJS(seek)(progress.get());
    });

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const step = e.nativeEvent.actionName === "increment" ? 5 : -5;
    onSeek(Math.min(duration, Math.max(0, currentTime + step)));
  };

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={{ width: SIZE, height: SIZE }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Song position"
        accessibilityValue={{
          text: `${clock(currentTime)} of ${clock(duration)}`,
        }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={onAccessibilityAction}
      >
        <Canvas style={{ width: SIZE, height: SIZE }}>
          {/* Glow behind the record */}
          <Circle cx={C} cy={C} r={DISC / 2} color={glow} opacity={0.45}>
            <BlurMask blur={28} style="normal" />
          </Circle>

          {art && (
            <Group origin={vec(C, C)} transform={rotation}>
              <Image
                image={art}
                x={C - DISC / 2}
                y={C - DISC / 2}
                width={DISC}
                height={DISC}
                fit="cover"
              />
            </Group>
          )}

          {/* A still sheen across the spinning disc, like light on vinyl */}
          <Circle cx={C} cy={C} r={DISC / 2}>
            <LinearGradient
              start={vec(C - DISC / 2, C - DISC / 2)}
              end={vec(C + DISC / 2, C + DISC / 2)}
              colors={[
                "rgba(255,255,255,0.14)",
                "rgba(255,255,255,0)",
                "rgba(255,255,255,0.06)",
              ]}
              positions={[0, 0.5, 1]}
            />
          </Circle>

          {/* Progress ring: faint track, glowing arc, and a knob to grab */}
          <Circle
            cx={C}
            cy={C}
            r={RING}
            style="stroke"
            strokeWidth={3}
            color={colours.teal[700]}
          />
          <Path
            path={RING_PATH}
            start={0}
            end={progress}
            style="stroke"
            strokeWidth={8}
            strokeCap="round"
            color={colours.violet[500]}
            opacity={0.6}
          >
            <BlurMask blur={6} style="normal" />
          </Path>
          <Path
            path={RING_PATH}
            start={0}
            end={progress}
            style="stroke"
            strokeWidth={3}
            strokeCap="round"
            color={colours.violet[200]}
          />
          <Circle c={knob} r={7} color={colours.textPrimary} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}
