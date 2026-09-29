import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { GlowOrb } from '@/components/GlowOrb';
import { LETTERS, spokenName, type Letter, type Mode } from '@/data/notes';
import colours from '@/theme/colours';

const ORB_SIZE = 150;
const NEIGHBOUR_SCALE = 0.6;
const NEIGHBOUR_OPACITY = 0.35;
const ease = Easing.out(Easing.quad);

type Props = {
  mode: Mode;
  selected: Letter | null;
  onSelect: (letter: Letter) => void;
  onFocusChange?: (letter: Letter) => void;
  initialIndex?: number;
};

export function OrbCarousel({ mode, selected, onSelect, onFocusChange, initialIndex = 3 }: Props) {
  const { width } = useWindowDimensions();
  const itemWidth = width * 0.45; // puts the neighbours' centres near the screen edges

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(initialIndex * itemWidth);
  const [focused, setFocused] = useState(initialIndex);
  const didInitialScroll = useRef(false);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const focus = (index: number) => {
    if (index === focused) return;
    setFocused(index);
    onFocusChange?.(LETTERS[index]);
  };

  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / itemWidth);
    focus(Math.max(0, Math.min(LETTERS.length - 1, index)));
  };

  const onPressOrb = (index: number) => {
    if (index === focused) return onSelect(LETTERS[index]);
    // Tapping a neighbour brings it to the centre

    // Use onMomentumScrollEnd, so update focus directly.
    scrollRef.current?.scrollTo({ x: index * itemWidth, animated: true });
    focus(index);
  };

  return (
    <Animated.ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={itemWidth}
      decelerationRate="fast"
      disableIntervalMomentum // one swipe = one orb
      onScroll={onScroll}
      scrollEventThrottle={16}
      onMomentumScrollEnd={onSettle}
      onLayout={() => {
        if (didInitialScroll.current) return;
        didInitialScroll.current = true;
        scrollRef.current?.scrollTo({ x: initialIndex * itemWidth, animated: false });
      }}
      contentContainerStyle={{ paddingHorizontal: (width - itemWidth) / 2 }}
      style={{ height: ORB_SIZE * 3, flexGrow: 0 }} // tall enough that the halo fades out before being clipped
    >
      {LETTERS.map((letter, index) => (
        <CarouselOrb
          key={letter}
          letter={letter}
          mode={mode}
          index={index}
          itemWidth={itemWidth}
          scrollX={scrollX}
          isSelected={selected === letter}
          onPress={() => onPressOrb(index)}
        />
      ))}
    </Animated.ScrollView>
  );
}

type ItemProps = {
  letter: Letter;
  mode: Mode;
  index: number;
  itemWidth: number;
  scrollX: SharedValue<number>;
  isSelected: boolean;
  onPress: () => void;
};

function CarouselOrb({ letter, mode, index, itemWidth, scrollX, isSelected, onPress }: ItemProps) {
  const pulse = useSharedValue(1);

  // 0 when centred, 1 when one step or more away
  const distance = useDerivedValue(() => Math.min(Math.abs(scrollX.value / itemWidth - index), 1));

  const orbStyle = useAnimatedStyle(() => ({
    opacity: interpolate(distance.value, [0, 1], [1, NEIGHBOUR_OPACITY]),
    transform: [{ scale: interpolate(distance.value, [0, 1], [1, NEIGHBOUR_SCALE]) * pulse.value }],
  }));

  // crossfade a crisp orb and a blurred one instead of animating it
  const crispStyle = useAnimatedStyle(() => ({ opacity: 1 - distance.value }));
  const blurredStyle = useAnimatedStyle(() => ({ opacity: distance.value }));

  useEffect(() => {
    if (!isSelected) return;
    pulse.value = withSequence(
      withTiming(1.12, { duration: 150, easing: ease }),
      withTiming(1, { duration: 250, easing: ease }),
    );
  }, [isSelected, pulse]);

  const { core, edge } = colours.orb[letter][mode];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spokenName(letter, mode)}
      accessibilityState={{ selected: isSelected }}
      style={{ width: itemWidth }}
      className="items-center justify-center"
    >
      <Animated.View style={orbStyle}>
        <Animated.View style={crispStyle}>
          <GlowOrb core={core} edge={edge} size={ORB_SIZE} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, blurredStyle]}>
          <GlowOrb core={core} edge={edge} size={ORB_SIZE} softness={0.9} shimmer={false} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}