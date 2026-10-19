import { useEffect, useMemo, useRef } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type AccessibilityActionEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

/** Height of one row (also its tap target); the wheel shows five, with the chosen one in the middle. */
export const WHEEL_ROW = 52;
export const WHEEL_ROWS = 5;
// The numbers repeat so the wheel turns past 59 back to 00; after each spin it re-centres on the middle copy, so it never runs out
const COPIES = 5;
// A slow drag that's let go without a flick may never get a momentum event, so settle on the drag's end too
const SETTLE_AFTER_DRAG_MS = 120;

const two = (n: number) => String(n).padStart(2, "0");

type Props = {
  /** How many values: 24 for hours, 60 for minutes. */
  count: number;
  value: number;
  onChange: (value: number) => void;
  /** For screen readers, e.g. "Hour". */
  label: string;
  /** For screen readers, e.g. "hours". */
  unit: string;
};

/**
 One wheel of the time picker: drag, flick or tap a number, and it settles on a value with a small tick as each one
 passes, as on a phone. To a screen reader it's one adjustable control (swipe up or down to change it).
 */
export function TimeWheel({ count, value, onChange, label, unit }: Props) {
  const scroller = useRef<ScrollView>(null);
  const reduceMotion = useReducedMotion();
  const middle = Math.floor(COPIES / 2) * count;
  const centred = useRef(middle + value); // the row in the middle right now, for the tick
  const placed = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rows = useMemo(
    () => Array.from({ length: count * COPIES }, (_, i) => i % count),
    [count],
  );

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  const rowAt = (y: number) => Math.round(y / WHEEL_ROW);
  const valueOf = (row: number) => ((row % count) + count) % count;
  const jumpTo = (row: number, animated: boolean) =>
    scroller.current?.scrollTo({
      y: row * WHEEL_ROW,
      animated: animated && !reduceMotion,
    });

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const row = rowAt(e.nativeEvent.contentOffset.y);
    if (row === centred.current) return;
    centred.current = row;
    void Haptics.selectionAsync();
  };

  const settle = (y: number) => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = null;
    const row = rowAt(y);
    const settled = valueOf(row);
    onChange(settled);
    const home = middle + settled;
    centred.current = home;
    // Snap exactly onto the row (a slow drag can stop between two), on the middle copy
    if (row !== home || y !== row * WHEEL_ROW) jumpTo(home, false);
  };

  const onDragEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    settleTimer.current = setTimeout(() => settle(y), SETTLE_AFTER_DRAG_MS);
  };

  const choose = (row: number) => {
    const next = valueOf(row);
    onChange(next);
    centred.current = middle + next;
    jumpTo(middle + next, true);
    void Haptics.selectionAsync();
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) =>
    choose(
      middle + value + (e.nativeEvent.actionName === "increment" ? 1 : -1),
    );

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: `${value} ${unit}` }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={onAccessibilityAction}
      style={{ width: 88, height: WHEEL_ROW * WHEEL_ROWS }}
    >
      <ScrollView
        ref={scroller}
        onLayout={() => {
          if (placed.current) return;
          placed.current = true;
          jumpTo(middle + value, false);
        }}
        snapToInterval={WHEEL_ROW}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        overScrollMode="never"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollEndDrag={onDragEnd}
        onMomentumScrollBegin={() => {
          // A flick: the momentum end settles it instead
          if (settleTimer.current) clearTimeout(settleTimer.current);
          settleTimer.current = null;
        }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        contentContainerStyle={{
          paddingVertical: WHEEL_ROW * Math.floor(WHEEL_ROWS / 2),
        }}
      >
        {rows.map((n, i) => (
          <Pressable
            key={i}
            onPress={() => choose(i)} // tap a number to bring it to the middle
            importantForAccessibility="no"
            style={{ height: WHEEL_ROW }}
            className="items-center justify-center"
          >
            <Text className="font-mono-medium text-h2 text-primary">
              {two(n)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
