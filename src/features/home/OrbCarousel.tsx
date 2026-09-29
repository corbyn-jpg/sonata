import { memo, useEffect, useMemo, useRef } from 'react';
import { Text, View, useWindowDimensions, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Ellipse } from 'react-native-svg';
import { GlowOrb } from '@/components/GlowOrb';
import { LETTERS, displayName, spokenName, type Letter, type Mode } from '@/data/notes';
import colours from '@/theme/colours';

const ORB_SIZE = 150;
const NEIGHBOUR_SCALE = 0.6;
const NEIGHBOUR_OPACITY = 0.35;
const LAST = LETTERS.length - 1;
const SPRING = { duration: 650, dampingRatio: 0.9 };
const FLICK_VELOCITY = 500; // px/s — a quick flick moves one orb even if the drag was short
const ease = Easing.out(Easing.quad);

type Props = {
  mode: Mode;
  /** Fractional index of the centred orb. Shared with the atmosphere. */
  position: SharedValue<number>;
  focused: number;
  onFocusChange: (index: number) => void;
  selected: Letter | null;
  onSelect: (letter: Letter) => void;
};

export function OrbCarousel({ mode, position, focused, onFocusChange, selected, onSelect }: Props) {
  const { width } = useWindowDimensions();
  const step = width * 0.45; // puts the neighbours' centres near the screen edges
  const start = useSharedValue(0);

  // Gesture callbacks run on the UI thread and can't see fresh React state
  const focusedRef = useRef(focused);
  focusedRef.current = focused;

  const settle = (index: number) => {
    if (index === focusedRef.current) return;
    focusedRef.current = index;
    onFocusChange(index);
  };

  const goTo = (index: number) => {
    position.value = withSpring(index, SPRING);
    settle(index);
  };

  const onTap = (offset: number) => {
    const current = focusedRef.current;
    if (offset === 0) return onSelect(LETTERS[current]);
    goTo(clamp(current + Math.sign(offset), 0, LAST)); // tapping an edge orb brings it to the centre
  };

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([-10, 10])
      .failOffsetY([-15, 15]) // leave vertical swipes for the Bright/Dark pages
      .onStart(() => {
        start.value = position.value;
      })
      .onUpdate((e) => {
        // Slight rubber-band past the first and last orb
        position.value = clamp(start.value - e.translationX / step, -0.35, LAST + 0.35);
      })
      .onEnd((e) => {
        const from = Math.round(start.value);
        let target = Math.round(position.value);
        if (target === from && Math.abs(e.velocityX) > FLICK_VELOCITY) target = from - Math.sign(e.velocityX);
        target = clamp(target, Math.max(0, from - 1), Math.min(LAST, from + 1)); // one swipe = one orb
        position.value = withSpring(target, { ...SPRING, velocity: -e.velocityX / step });
        runOnJS(settle)(target);
      });

    const tap = Gesture.Tap().onEnd((e, success) => {
      if (success) runOnJS(onTap)(Math.round((e.x - width / 2) / step));
    });

    return Gesture.Race(pan, tap);
    // settle/onTap read focusedRef, so the gesture only needs rebuilding when the layout changes eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, step]);

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const current = focusedRef.current;
    if (e.nativeEvent.actionName === 'increment') goTo(Math.min(LAST, current + 1));
    if (e.nativeEvent.actionName === 'decrement') goTo(Math.max(0, current - 1));
    if (e.nativeEvent.actionName === 'activate') onSelect(LETTERS[current]);
  };

  const letter = LETTERS[focused];

  return (
    <GestureDetector gesture={gesture}>
      <View
        className="flex-1"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Today's note"
        accessibilityValue={{ text: spokenName(letter, mode) + (selected === letter ? ', selected' : '') }}
        accessibilityHint="Swipe up or down to change, double-tap to choose"
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
        onAccessibilityAction={onAccessibilityAction}
      >
        <Orbits width={width} />
        {/* Only mount orbs that can be on screen */}
        {LETTERS.map((l, index) =>
          Math.abs(index - focused) > 2 ? null : (
            <CarouselOrb
              key={l}
              letter={l}
              mode={mode}
              index={index}
              step={step}
              width={width}
              position={position}
              isFocused={index === focused}
              isSelected={selected === l}
            />
          ),
        )}
      </View>
    </GestureDetector>
  );
}

/** Faint orbit paths behind the orbs */
function Orbits({ width }: { width: number }) {
  const cx = width / 2;
  const cy = ORB_SIZE;
  return (
    <Svg width={width} height={ORB_SIZE * 2} style={{ position: 'absolute', top: '50%', marginTop: -ORB_SIZE }}>
      <Ellipse
        cx={cx}
        cy={cy}
        rx={width * 0.46}
        ry={ORB_SIZE * 0.36}
        rotation={-8}
        origin={[cx, cy]}
        fill="none"
        stroke={colours.violet[200]}
        strokeOpacity={0.1}
      />
      <Ellipse
        cx={cx}
        cy={cy}
        rx={width * 0.6}
        ry={ORB_SIZE * 0.6}
        rotation={6}
        origin={[cx, cy]}
        fill="none"
        stroke={colours.violet[200]}
        strokeOpacity={0.05}
      />
    </Svg>
  );
}

type ItemProps = {
  letter: Letter;
  mode: Mode;
  index: number;
  step: number;
  width: number;
  position: SharedValue<number>;
  isFocused: boolean;
  isSelected: boolean;
};

const CarouselOrb = memo(function CarouselOrb({
  letter,
  mode,
  index,
  step,
  width,
  position,
  isFocused,
  isSelected,
}: ItemProps) {
  const pulse = useSharedValue(1);
  const offset = useDerivedValue(() => index - position.value); 
  const distance = useDerivedValue(() => Math.abs(offset.value));

  const slotStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value * step }] }));
  const orbStyle = useAnimatedStyle(() => ({
    opacity: interpolate(distance.value, [0, 1, 2], [1, NEIGHBOUR_OPACITY, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(distance.value, [0, 1], [1, NEIGHBOUR_SCALE], Extrapolation.CLAMP) * pulse.value },
    ],
  }));

  // crossfade a crisp orb and a blurred one instead of animating it
  const crispStyle = useAnimatedStyle(() => ({ opacity: clamp(1 - distance.value, 0, 1) }));
  const blurredStyle = useAnimatedStyle(() => ({ opacity: clamp(distance.value, 0, 1) }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: clamp(1 - distance.value * 2, 0, 1) }));

  useEffect(() => {
    if (!isSelected) return;
    pulse.value = withSequence(
      withTiming(1.12, { duration: 150, easing: ease }),
      withTiming(1, { duration: 250, easing: ease }),
    );
  }, [isSelected, pulse]);

  const { core, edge } = colours.orb[letter][mode];

  return (
    <Animated.View
      style={[{ position: 'absolute', top: '50%', left: (width - ORB_SIZE) / 2, marginTop: -ORB_SIZE / 2 }, slotStyle]}
    >
      <Animated.View style={orbStyle}>
        <Animated.View style={crispStyle}>
          <GlowOrb core={core} edge={edge} size={ORB_SIZE} shimmer={isFocused} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, blurredStyle]}>
          <GlowOrb core={core} edge={edge} size={ORB_SIZE} softness={1} shimmer={false} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: ORB_SIZE + 28, left: 0, right: 0 }, labelStyle]}>
        <Text className="text-center font-mono-medium text-h4 text-secondary">{displayName(letter, mode)}</Text>
      </Animated.View>
    </Animated.View>
  );
});