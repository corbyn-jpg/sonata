import { memo, useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import {
  Canvas,
  Circle,
  Group,
  RadialGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import colours from "@/theme/colours";

const STARS_PER_LAYER = 24;
const LAYERS = 3;
const NO_GLOW = [0, 0, 0, 0];

type Star = { x: number; y: number; r: number; opacity: number };

type Props = {
  /** RGBA (0–1) of the colour wash behind the content, e.g. from Skia's interpolateColors. Omit for stars only. */
  glow?: SharedValue<number[]>;
  /** Set false to pause the ambient motion, e.g. while the screen isn't focused. */
  animated?: boolean;
  seed?: number;
  /** Multiplies the drift and twinkle durations: above 1 is slower and calmer. */
  pace?: number;
};

// Seeded so the sky doesn't reshuffle on every reload
function seededRandom(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** Colour wash + drifting starfield, drawn in a single Skia canvas. */
export const Sky = memo(function Sky({
  glow,
  animated = true,
  pace = 1,
  seed = 7,
}: Props) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);
  const twinkle = useSharedValue(1);
  const moving = animated && !reduceMotion;

  const layers = useMemo(() => {
    const random = seededRandom(seed);
    return Array.from({ length: LAYERS }, () =>
      Array.from({ length: STARS_PER_LAYER }, (): Star => ({
        x: random() * width,
        y: random() * height,
        r: random() < 0.85 ? 0.8 : 1.4,
        opacity: 0.25 + random() * 0.5,
      })),
    );
  }, [seed, width, height]);

  useEffect(() => {
    if (!moving) return;
    const ease = Easing.inOut(Easing.sin);
    drift.value = withRepeat(
      withTiming(1, { duration: 7500 * pace, easing: ease }),
      -1,
      true,
    );
    twinkle.value = withRepeat(
      withTiming(0.4, { duration: 1000 * pace, easing: ease }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(drift);
      cancelAnimation(twinkle);
    };
  }, [moving, pace, drift, twinkle]);

  // Same colour at 30% → 10% → 0%, scaled by the glow's own alpha (a dimmer wash on the Dark page)
  const glowColours = useDerivedValue(() => {
    const [r, g, b, a = 1] = glow?.value ?? NO_GLOW;
    return [
      [r, g, b, 0.3 * a],
      [r, g, b, 0.1 * a],
      [r, g, b, 0],
    ];
  });

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      {glow && (
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(width / 2, height * 0.42)}
            r={height * 0.6}
            colors={glowColours}
            positions={[0, 0.5, 1]}
          />
        </Rect>
      )}
      {layers.map((stars, index) => (
        <StarLayer
          key={index}
          index={index}
          stars={stars}
          drift={drift}
          twinkle={twinkle}
        />
      ))}
    </Canvas>
  );
});

type LayerProps = {
  index: number;
  stars: Star[];
  drift: SharedValue<number>;
  twinkle: SharedValue<number>;
};

function StarLayer({ index, stars, drift, twinkle }: LayerProps) {
  // Nearer layers drift further (parallax); only the first layer twinkles
  const transform = useDerivedValue(() => [
    { translateX: drift.value * (index + 1) * 6 },
    { translateY: drift.value * (index + 1) * -10 },
  ]);
  const opacity = useDerivedValue(() => (index === 0 ? twinkle.value : 1));

  return (
    <Group transform={transform} opacity={opacity}>
      {stars.map((star, i) => (
        <Circle
          key={i}
          cx={star.x}
          cy={star.y}
          r={star.r}
          color={colours.textPrimary}
          opacity={star.opacity}
        />
      ))}
    </Group>
  );
}
