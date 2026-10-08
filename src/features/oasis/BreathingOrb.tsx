import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Path,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import { Orb } from "@/components/GlowOrb";
import colours from "@/theme/colours";
import { breathAt } from "./breathing";

export const BREATHING_SIZE = 500;
const C = BREATHING_SIZE / 2;
const ORB = 200; // diameter when the lungs are full
const RING = C - 120;
const RING_PATH = Skia.PathBuilder.Make()
  .addArc(Skia.XYWHRect(C - RING, C - RING, 2 * RING, 2 * RING), -90, 359.9)
  .build();

type Props = {
  /** Seconds since the session started. */
  elapsed: SharedValue<number>;
  /** With Reduce Motion on, the orb stays one size and only brightens and dims. */
  still: boolean;
};

/**
 The breathing orb: it grows and brightens as you breathe in and shrinks and dims as you breathe out, with a ring round it tracing the session. Everything follows `elapsed` on the UI thread.
 */
export function BreathingOrb({ elapsed, still }: Props) {
  const fullness = useDerivedValue(() => breathAt(elapsed.get()).fullness);
  const progress = useDerivedValue(() => breathAt(elapsed.get()).progress);
  const transform = useDerivedValue(() => [
    { scale: still ? 0.85 : 0.55 + 0.45 * fullness.get() },
  ]);
  const glow = useDerivedValue(() => 0.35 + 0.5 * fullness.get());

  return (
    <Canvas style={{ width: BREATHING_SIZE, height: BREATHING_SIZE }}>
      <Circle
        cx={C}
        cy={C}
        r={RING}
        style="stroke"
        strokeWidth={2}
        color={colours.border}
        opacity={0.6}
      />
      <Path
        path={RING_PATH}
        start={0}
        end={progress}
        style="stroke"
        strokeWidth={3}
        strokeCap="round"
        color={colours.teal[300]}
      />
      <Group origin={vec(C, C)} transform={transform}>
        <Orb
          cx={C}
          cy={C}
          size={ORB}
          core={colours.teal[300]}
          edge={colours.violet[500]}
          glow={glow}
        />
      </Group>
      {/* A soft dark halo behind the words in the middle, so they stay readable on the bright orb */}
      <Circle cx={C} cy={C} r={58} color={colours.canvas} opacity={0.45}>
        <BlurMask blur={22} style="normal" />
      </Circle>
    </Canvas>
  );
}
