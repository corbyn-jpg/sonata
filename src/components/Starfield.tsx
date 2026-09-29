import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import colours from '@/theme/colours';

const STARS_PER_LAYER = 24;
const LAYERS = 3; // each layer drifts at its own speed

type Star = { x: number; y: number; r: number; opacity: number };

// Seeded so the sky doesn't reshuffle on every reload
function seededRandom(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export const Starfield = memo(function Starfield({ seed = 7 }: { seed?: number }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);

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
    if (reduceMotion) return;
    drift.value = withRepeat(withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(drift);
  }, [reduceMotion, drift]);

  return layers.map((stars, index) => (
    <StarLayer key={index} index={index} stars={stars} drift={drift} width={width} height={height} />
  ));
});

type LayerProps = { index: number; stars: Star[]; drift: SharedValue<number>; width: number; height: number };

function StarLayer({ index, stars, drift, width, height }: LayerProps) {
  const reduceMotion = useReducedMotion();
  const twinkle = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion || index > 0) return;
    twinkle.value = withRepeat(withTiming(0.4, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(twinkle);
  }, [index, reduceMotion, twinkle]);

  // Nearer layers drift further 
  const style = useAnimatedStyle(() => ({
    opacity: twinkle.value,
    transform: [{ translateX: drift.value * (index + 1) * 6 }, { translateY: drift.value * (index + 1) * -10 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={width} height={height}>
        {stars.map((star, i) => (
          <Circle key={i} cx={star.x} cy={star.y} r={star.r} fill={colours.textPrimary} opacity={star.opacity} />
        ))}
      </Svg>
    </Animated.View>
  );
}