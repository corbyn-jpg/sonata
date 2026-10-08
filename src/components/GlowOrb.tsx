import { memo, useEffect } from "react";
import { View } from "react-native";
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  RadialGradient,
  vec,
  type Color,
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

type Animatable = number | SharedValue<number>;

const read = (value: Animatable) => {
  "worklet";
  return typeof value === "number" ? value : value.value;
};

// A colour, or anything animated that holds one (shared or derived value)
type Paint = Color | { readonly value: Color };

const readColour = (value: Paint) => {
  "worklet";
  return typeof value === "object" && value !== null && "value" in value
    ? value.value
    : value;
};

type OrbProps = {
  cx: number;
  cy: number;
  /** Diameter of the orb body. */
  size: number;
  /** Colours can be shared values, so an orb can blend between palettes. */
  core: Paint;
  edge: Paint;
  /** 0 = crisp rim, 1 = heavily blurred (carousel neighbours). */
  softness?: Animatable;
  /** Halo brightness, 0–1. Animate it for the shimmer. */
  glow?: Animatable;
  /** Faint outer aura — hero orbs only. */
  aura?: boolean;
};

/**
 * A glow orb drawn with Skia. Use inside a <Canvas>, so several orbs can share one GPU surface.
 * Halo: the orb at 2× with a real blur at 40% (spec). Body: two-colour radial gradient.
 */
export function Orb({
  cx,
  cy,
  size,
  core,
  edge,
  softness = 0,
  glow = 1,
  aura = false,
}: OrbProps) {
  const r = size / 2;
  const haloOpacity = useDerivedValue(() => 0.4 * read(glow));
  // Skia skips a zero blur, so keep a sub-pixel minimum
  const bodyBlur = useDerivedValue(() =>
    Math.max(0.5, read(softness) * size * 0.15),
  );

  const coreColour = useDerivedValue(() => readColour(core));
  const gradient = useDerivedValue(() => [readColour(core), readColour(edge)]);

  return (
    <Group>
      {aura && (
        <Circle
          cx={cx}
          cy={cy}
          r={size * 1.5}
          color={coreColour}
          opacity={0.15}
        >
          <BlurMask blur={size * 0.5} style="normal" />
        </Circle>
      )}
      <Circle cx={cx} cy={cy} r={size} color={coreColour} opacity={haloOpacity}>
        <BlurMask blur={size * 0.2} style="normal" />
      </Circle>
      <Circle cx={cx} cy={cy} r={r}>
        {/* Centre nudged up-left so the orb reads as a lit sphere, not a flat disc */}
        <RadialGradient
          c={vec(cx - r * 0.16, cy - r * 0.24)}
          r={r * 1.2}
          colors={gradient}
        />
        <BlurMask blur={bodyBlur} style="normal" />
      </Circle>
    </Group>
  );
}

type GlowOrbProps = Omit<OrbProps, "cx" | "cy" | "glow" | "softness"> & {
  softness?: number;
  /** Slow halo shimmer. Skipped when the OS asks for reduced motion. */
  shimmer?: boolean;
};

/** A standalone orb with its own canvas. Takes up `size × size`; the glow spills past it. */
export const GlowOrb = memo(function GlowOrb({
  size,
  shimmer = true,
  aura = false,
  ...orb
}: GlowOrbProps) {
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(1);

  useEffect(() => {
    if (!shimmer || reduceMotion) return;
    glow.value = withRepeat(
      withTiming(0.7, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(glow);
      glow.value = 1;
    };
  }, [shimmer, reduceMotion, glow]);

  const canvas = size * (aura ? 5 : 3); // room for the blur to fade out
  const c = canvas / 2;

  return (
    <View style={{ width: size, height: size, pointerEvents: "none" }}>
      <Canvas
        style={{
          position: "absolute",
          left: (size - canvas) / 2,
          top: (size - canvas) / 2,
          width: canvas,
          height: canvas,
        }}
      >
        <Orb cx={c} cy={c} size={size} glow={glow} aura={aura} {...orb} />
      </Canvas>
    </View>
  );
});
