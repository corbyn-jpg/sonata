import { useEffect, useMemo, useRef } from "react";
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
export function SongDisc({ art, glow, playing, currentTime, duration, active, onSeek }: Props) {
  const reduceMotion = useReducedMotion();
  const angle = useSharedValue(0);
  const speed = useSharedValue(0);
  const spinning = useSharedValue(false);
  const advancing = useSharedValue(false);
  const progress = useSharedValue(0);
  const total = useSharedValue(0);
  const scrubbing = useSharedValue(false);

  useEffect(() => {
    advancing.value = playing;
    spinning.value = playing && !reduceMotion; // with Reduce Motion on, the disc stays still
  }, [playing, reduceMotion, advancing, spinning]);

  useEffect(() => {
    total.value = duration;
  }, [duration, total]);

  // The player reports coarsely; between reports the ring moves on by itself, so only correct it when it has drifted (or after a seek)
  useEffect(() => {
    if (scrubbing.value || duration <= 0) return;
    const reported = Math.min(1, currentTime / duration);
    if (!playing || Math.abs(reported - progress.value) > 0.015) progress.value = reported;
  }, [currentTime, duration, playing, progress, scrubbing]);

  const frame = useFrameCallback((info) => {
    const dt = (info.timeSincePreviousFrame ?? 16) / 1000;
    // Ease the spin up and down rather than starting and stopping dead
    const target = spinning.value ? SPIN : 0;
    speed.value += (target - speed.value) * Math.min(1, dt * 1.5);
    angle.value = (angle.value + speed.value * dt) % (2 * Math.PI);
    if (advancing.value && !scrubbing.value && total.value > 0)
      progress.value = Math.min(1, progress.value + dt / total.value);
  }, false);

  useEffect(() => {
    frame.setActive(active);
  }, [active, frame]);

  const rotation = useDerivedValue(() => [{ rotate: angle.value }]);

  const ringPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addArc({ x: C - RING, y: C - RING, width: 2 * RING, height: 2 * RING }, -90, 359.9);
    return path;
  }, []);
  const knob = useDerivedValue(() => {
    const a = -Math.PI / 2 + progress.value * 2 * Math.PI;
    return vec(C + Math.cos(a) * RING, C + Math.sin(a) * RING);
  });

  // The gesture is built once, so it reads the latest callback and duration through a ref
  const latest = useRef({ onSeek, duration });
  latest.current = { onSeek, duration };

  const gesture = useMemo(() => {
    // Touch angle → how far through the song (12 o'clock = start, clockwise)
    const progressAt = (x: number, y: number) => {
      "worklet";
      const a = Math.atan2(y - C, x - C) + Math.PI / 2;
      return (a < 0 ? a + 2 * Math.PI : a) / (2 * Math.PI);
    };
    const seek = (fraction: number) => latest.current.onSeek(fraction * latest.current.duration);

    return Gesture.Pan()
      .minDistance(0)
      .onBegin((e) => {
        // Only touches near the ring scrub; the rest of the disc is just a picture
        if (Math.abs(Math.hypot(e.x - C, e.y - C) - RING) > GRAB) return;
        scrubbing.value = true;
        progress.value = progressAt(e.x, e.y);
      })
      .onUpdate((e) => {
        if (scrubbing.value) progress.value = progressAt(e.x, e.y);
      })
      .onFinalize(() => {
        if (!scrubbing.value) return;
        scrubbing.value = false;
        runOnJS(seek)(progress.value);
      });
  }, [progress, scrubbing]);

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
        accessibilityValue={{ text: `${clock(currentTime)} of ${clock(duration)}` }}
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
              <Image image={art} x={C - DISC / 2} y={C - DISC / 2} width={DISC} height={DISC} fit="cover" />
            </Group>
          )}

          {/* A still sheen across the spinning disc, like light on vinyl */}
          <Circle cx={C} cy={C} r={DISC / 2}>
            <LinearGradient
              start={vec(C - DISC / 2, C - DISC / 2)}
              end={vec(C + DISC / 2, C + DISC / 2)}
              colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0)", "rgba(255,255,255,0.06)"]}
              positions={[0, 0.5, 1]}
            />
          </Circle>

          {/* Progress ring: faint track, glowing arc, and a knob to grab */}
          <Circle cx={C} cy={C} r={RING} style="stroke" strokeWidth={3} color={colours.teal[700]} />
          <Path path={ringPath} start={0} end={progress} style="stroke" strokeWidth={8} strokeCap="round" color={colours.violet[500]} opacity={0.6}>
            <BlurMask blur={6} style="normal" />
          </Path>
          <Path path={ringPath} start={0} end={progress} style="stroke" strokeWidth={3} strokeCap="round" color={colours.violet[200]} />
          <Circle c={knob} r={7} color={colours.textPrimary} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}