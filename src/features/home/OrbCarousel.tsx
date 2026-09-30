import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Canvas, Group, mixColors, Oval, vec } from "@shopify/react-native-skia";
import Animated, {
  cancelAnimation,
  clamp,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Orb } from "@/components/GlowOrb";
import {
  LETTERS,
  displayName,
  spokenName,
  type Letter,
  type Mode,
} from "@/data/notes";
import { NoteStaff } from "./NoteStaff";
import colours from "@/theme/colours";

const ORB_SIZE = 150;
const STAFF_GAP = 40; // orb edge to top staff line
const LABEL_GAP = STAFF_GAP + 32 + 28; // below the staff, clear of ledger lines and stems
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
  /** 0 = Bright, 1 = Dark — animated, so the orbs crossfade between palettes */
  page: SharedValue<number>;
  focused: number;
  onFocusChange: (index: number) => void;
  selected: Letter | null;
  onSelect: (letter: Letter) => void;
  /** Set false to pause the shimmer, e.g. while the screen isn't focused. */
  animated?: boolean;
};

export function OrbCarousel({
  mode,
  position,
  page,
  focused,
  onFocusChange,
  selected,
  onSelect,
  animated = true,
}: Props) {
  const { width } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  const step = width * 0.45; // puts the neighbours' centres near the screen edges
  const start = useSharedValue(0);

    // The gesture is built once, so it must read the latest state and callbacks through refs — otherwise it keeps calling the first render's versions (e.g. with the old Bright/Dark mode)
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const onFocusChangeRef = useRef(onFocusChange);
  onFocusChangeRef.current = onFocusChange;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const settle = (index: number) => {
    if (index === focusedRef.current) return;
        onFocusChangeRef.current(index);
    onFocusChange(index);
  };

  const goTo = (index: number) => {
    position.value = withSpring(index, SPRING);
    settle(index);
  };

  const onTap = (offset: number) => {
    const current = focusedRef.current;
        if (offset === 0) return onSelectRef.current(LETTERS[current]);
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
        position.value = clamp(
          start.value - e.translationX / step,
          -0.35,
          LAST + 0.35,
        );
      })
      .onEnd((e) => {
        const from = Math.round(start.value);
        let target = Math.round(position.value);
        if (target === from && Math.abs(e.velocityX) > FLICK_VELOCITY)
          target = from - Math.sign(e.velocityX);
        target = clamp(target, Math.max(0, from - 1), Math.min(LAST, from + 1)); // one swipe = one orb
        position.value = withSpring(target, {
          ...SPRING,
          velocity: -e.velocityX / step,
        });
        runOnJS(settle)(target);
      });

    const tap = Gesture.Tap().onEnd((e, success) => {
      if (success) runOnJS(onTap)(Math.round((e.x - width / 2) / step));
    });

    return Gesture.Race(pan, tap);
    // settle/onTap read focusedRef, so the gesture only needs rebuilding when the layout changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, step]);

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const current = focusedRef.current;
    if (e.nativeEvent.actionName === "increment")
      goTo(Math.min(LAST, current + 1));
    if (e.nativeEvent.actionName === "decrement")
      goTo(Math.max(0, current - 1));
    if (e.nativeEvent.actionName === "activate") onSelect(LETTERS[current]);
  };

  const letter = LETTERS[focused];
  const cx = width / 2;
  const cy = height / 2;

  // Only the focused orb and two either side can be on screen. Draw the farthest first,
  // so the focused orb sits on top of its neighbours' halos.
  const visible = LETTERS.map((l, index) => ({ letter: l, index }))
    .filter(({ index }) => Math.abs(index - focused) <= 2)
    .sort((a, b) => Math.abs(b.index - focused) - Math.abs(a.index - focused));

  return (
    <GestureDetector gesture={gesture}>
      <View
        className="flex-1"
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Today's note"
        accessibilityValue={{
          text:
            spokenName(letter, mode) +
            (selected === letter ? ", selected" : ""),
        }}
        accessibilityHint="Swipe up or down to change, double-tap to choose"
        accessibilityActions={[
          { name: "increment" },
          { name: "decrement" },
          { name: "activate" },
        ]}
        onAccessibilityAction={onAccessibilityAction}
      >
        {height > 0 && (
          <>
            {/* Every orb and orbit path in one GPU canvas */}
            <Canvas style={StyleSheet.absoluteFill}>
              <Orbits cx={cx} cy={cy} width={width} />
              {visible.map(({ letter: l, index }) => (
                <CarouselOrb
                  key={l}
                  letter={l}
                  page={page}
                  index={index}
                  step={step}
                  cx={cx}
                  cy={cy}
                  position={position}
                  isFocused={index === focused}
                  isSelected={selected === l}
                  animated={animated}
                />
              ))}
              <NoteStaff
                cx={cx}
                top={cy + ORB_SIZE / 2 + STAFF_GAP}
                page={page}
                position={position}
              />
            </Canvas>
            {visible.map(({ letter: l, index }) => (
              <OrbLabel
                key={l}
                letter={l}
                mode={mode}
                index={index}
                step={step}
                cy={cy}
                position={position}
              />
            ))}
          </>
        )}
      </View>
    </GestureDetector>
  );
}

/** Faint orbit paths behind the orbs (spec: 5–10% opacity). */
function Orbits({ cx, cy, width }: { cx: number; cy: number; width: number }) {
  const origin = vec(cx, cy);
  return (
    <>
      <Group transform={[{ rotate: (-8 * Math.PI) / 180 }]} origin={origin}>
        <Oval
          x={cx - width * 0.46}
          y={cy - ORB_SIZE * 0.36}
          width={width * 0.92}
          height={ORB_SIZE * 0.72}
          style="stroke"
          strokeWidth={1}
          color={colours.violet[200]}
          opacity={0.1}
        />
      </Group>
      <Group transform={[{ rotate: (6 * Math.PI) / 180 }]} origin={origin}>
        <Oval
          x={cx - width * 0.6}
          y={cy - ORB_SIZE * 0.6}
          width={width * 1.2}
          height={ORB_SIZE * 1.2}
          style="stroke"
          strokeWidth={1}
          color={colours.violet[200]}
          opacity={0.05}
        />
      </Group>
    </>
  );
}

type OrbItemProps = {
  letter: Letter;
  index: number;
  step: number;
  cx: number;
  cy: number;
  position: SharedValue<number>;
  page: SharedValue<number>;
  isFocused: boolean;
  isSelected: boolean;
  animated: boolean;
};

const CarouselOrb = memo(function CarouselOrb({
  letter,
  index,
  step,
  cx,
  cy,
  position,
  page,
  isFocused,
  isSelected,
  animated,
}: OrbItemProps) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  const glow = useSharedValue(1);
  const offset = useDerivedValue(() => index - position.value); // -1 = left neighbour, +1 = right
  const distance = useDerivedValue(() => Math.abs(offset.value));

  const transform = useDerivedValue(() => [
    { translateX: offset.value * step },
    {
      scale:
        interpolate(
          distance.value,
          [0, 1],
          [1, NEIGHBOUR_SCALE],
          Extrapolation.CLAMP,
        ) * pulse.value,
    },
  ]);
  const opacity = useDerivedValue(() =>
    interpolate(
      distance.value,
      [0, 1, 2],
      [1, NEIGHBOUR_OPACITY, 0],
      Extrapolation.CLAMP,
    ),
  );
  // Real blur: neighbours soften continuously as they move away from the centre
  const softness = useDerivedValue(() => clamp(distance.value, 0, 1));

  // Only the centred orb shimmers
  useEffect(() => {
    if (!isFocused || !animated || reduceMotion) return;
    glow.value = withRepeat(
      withTiming(0.7, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(glow);
      glow.value = 1;
    };
  }, [isFocused, animated, reduceMotion, glow]);

  useEffect(() => {
    if (!isSelected) return;
    pulse.value = withSequence(
      withTiming(1.12, { duration: 150, easing: ease }),
      withTiming(1, { duration: 250, easing: ease }),
    );
  }, [isSelected, pulse]);

  // Blend between the Bright and Dark palettes as the page toggles
  const { major, minor } = colours.orb[letter];
  const core = useDerivedValue(() =>
    mixColors(page.value, major.core, minor.core),
  );
  const edge = useDerivedValue(() =>
    mixColors(page.value, major.edge, minor.edge),
  );

  return (
    <Group transform={transform} origin={vec(cx, cy)} opacity={opacity}>
      <Orb
        cx={cx}
        cy={cy}
        size={ORB_SIZE}
        core={core}
        edge={edge}
        softness={softness}
        glow={glow}
      />
    </Group>
  );
});

type LabelProps = {
  letter: Letter;
  mode: Mode;
  index: number;
  step: number;
  cy: number;
  position: SharedValue<number>;
};

/** The note under the centred orb. Plain text views, so they stay crisp and cheap. */
const OrbLabel = memo(function OrbLabel({
  letter,
  mode,
  index,
  step,
  cy,
  position,
}: LabelProps) {
  const style = useAnimatedStyle(() => {
    const offset = index - position.value;
    return {
      opacity: clamp(1 - Math.abs(offset) * 2, 0, 1),
      transform: [{ translateX: offset * step }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          right: 0,
          top: cy + ORB_SIZE / 2 + LABEL_GAP,
        },
        style,
      ]}
    >
      <Text className="text-center font-mono text-body text-muted">
        {displayName(letter, mode)}
      </Text>
    </Animated.View>
  );
});
