import { memo, useId } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LETTERS, type Mode } from '@/data/notes';
import colours from '@/theme/colours';

type Props = {
  /** Carousel position, so the wash follows the swipe live. */
  position: SharedValue<number>;
  focused: number;
  mode: Mode;
};

/** Whole-screen colour wash that crossfades to match the centred orb. */
export const Atmosphere = memo(function Atmosphere({ position, focused, mode }: Props) {
  const { width, height } = useWindowDimensions();
  // Only the focused wash and its neighbours can be visible, so only those are mounted
  return LETTERS.map((letter, index) =>
    Math.abs(index - focused) > 1 ? null : (
      <Wash
        key={letter}
        index={index}
        colour={colours.orb[letter][mode].core}
        position={position}
        width={width}
        height={height}
      />
    ),
  );
});

type WashProps = { index: number; colour: string; position: SharedValue<number>; width: number; height: number };

function Wash({ index, colour, position, width, height }: WashProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const style = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - Math.abs(position.value - index)) }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={id} gradientUnits="userSpaceOnUse" cx={width / 2} cy={height * 0.42} r={height * 0.6}>
            <Stop offset={0} stopColor={colour} stopOpacity={0.3} />
            <Stop offset={0.5} stopColor={colour} stopOpacity={0.1} />
            <Stop offset={1} stopColor={colour} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}