import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

type Props = {
  core: string;
  edge: string;

  /** Diameter of the orb body. The glow spreads past this without taking up layout space. */
  size: number;

  /** 0 = crisp rim, 1 = heavily blurred */
  softness?: number;

  /** Faint outer aura */
  aura?: boolean;

  /** Slow halo shimmer. Skipped when the OS asks for reduced motion. */
  shimmer?: boolean;
};

const CANVAS_SCALE = 4; // big enough that the aura fades out before the edge

export function GlowOrb({ core, edge, size, softness = 0.01, aura = false, shimmer = true }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''); // gradient ids must be unique per orb
  
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(1);

  useEffect(() => {
    if (!shimmer || reduceMotion) return;
    glow.value = withRepeat(withTiming(0.7, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(glow);
      glow.value = 1;
    };
  }, [shimmer, reduceMotion, glow]);

  const haloStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const canvas = size * CANVAS_SCALE;
  const c = canvas / 2;
  const coreR = (size / 2) * (1 + softness * 0.5); // blurred orbs spread wider
  const layer = {
    position: 'absolute',
    left: (size - canvas) / 2,
    top: (size - canvas) / 2,
    width: canvas,
    height: canvas,
  } as const;

  return (
    <View style={{ width: size, height: size, pointerEvents: 'none' }}>
      {aura && (
        <Svg width={canvas} height={canvas} style={layer}>
          <Defs>
            <RadialGradient id={`${id}aura`} gradientUnits="userSpaceOnUse" cx={c} cy={c} r={c}>
              <Stop offset={0} stopColor={core} stopOpacity={0.15} />
              <Stop offset={0.4} stopColor={core} stopOpacity={0.12} />
              <Stop offset={0.7} stopColor={core} stopOpacity={0.05} />
              <Stop offset={1} stopColor={core} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={c} cy={c} r={c} fill={`url(#${id}aura)`} />
        </Svg>
      )}

      <Animated.View style={[layer, haloStyle]}>
        <Svg width={canvas} height={canvas}>
          <Defs>
            <RadialGradient id={`${id}halo`} gradientUnits="userSpaceOnUse" cx={c} cy={c} r={c}>
              <Stop offset={0} stopColor={core} stopOpacity={0.4} />
              <Stop offset={0.25} stopColor={core} stopOpacity={0.4} />
              <Stop offset={0.45} stopColor={core} stopOpacity={0.2} />
              <Stop offset={0.65} stopColor={core} stopOpacity={0.06} />
              <Stop offset={0.85} stopColor={core} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={c} cy={c} r={c} fill={`url(#${id}halo)`} />
        </Svg>
      </Animated.View>

      <Svg width={canvas} height={canvas} style={layer}>
        <Defs>
            
          {/* Focal point nudged up-left so the orb reads as a lit sphere, not a flat disc */}
          <RadialGradient
            id={`${id}core`}
            gradientUnits="userSpaceOnUse"
            cx={c}
            cy={c}
            r={coreR}
            fx={c - coreR * 0.16}
            fy={c - coreR * 0.24}
          >
            <Stop offset={0} stopColor={core} stopOpacity={1} />
            <Stop offset={1 - softness * 0.75} stopColor={edge} stopOpacity={1 - softness * 0.4} />
            <Stop offset={1} stopColor={edge} stopOpacity={1 - softness} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={coreR} fill={`url(#${id}core)`} />
      </Svg>
    </View>
  );
}