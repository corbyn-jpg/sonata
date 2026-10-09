import { useMemo, useRef } from "react";
import {
  ScrollView,
  Text,
  View,
  type AccessibilityActionEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import * as Haptics from "expo-haptics";

/** Height of one row; the wheel shows five, with the chosen one in the middle. */
export const WHEEL_ROW = 52;
export const WHEEL_ROWS = 5;
// The numbers repeat so the wheel turns past 59 back to 00, like a phone's alarm clock; after each spin it
// quietly re-centres on the middle copy, so it never runs out in either direction
const COPIES = 5;

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
 One wheel of the time picker: drag or flick, and it settles on a value with a small tick as each one
 passes, as on a phone. To a screen reader it's one adjustable control (swipe up or down to change it).
 */
export function TimeWheel({ count, value, onChange, label, unit }: Props) {
  const scroller = useRef<ScrollView>(null);
  const middle = Math.floor(COPIES / 2) * count;
  const centred = useRef(middle + value); // the row in the middle right now, for the tick
  const placed = useRef(false);
  const rows = useMemo(
    () => Array.from({ length: count * COPIES }, (_, i) => i % count),
    [count],
  );

  const rowAt = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    Math.round(e.nativeEvent.contentOffset.y / WHEEL_ROW);
  const valueOf = (row: number) => ((row % count) + count) % count;
  const jumpTo = (row: number, animated: boolean) =>
    scroller.current?.scrollTo({ y: row * WHEEL_ROW, animated });

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const row = rowAt(e);
    if (row === centred.current) return;
    centred.current = row;
    void Haptics.selectionAsync();
  };

  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const settled = valueOf(rowAt(e));
    onChange(settled);
    const home = middle + settled;
    if (rowAt(e) !== home) {
      centred.current = home;
      jumpTo(home, false);
    }
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const next = valueOf(
      value + (e.nativeEvent.actionName === "increment" ? 1 : -1),
    );
    onChange(next);
    centred.current = middle + next;
    jumpTo(middle + next, true);
  };

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
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={onSettle}
        contentContainerStyle={{
          paddingVertical: WHEEL_ROW * Math.floor(WHEEL_ROWS / 2),
        }}
      >
        {rows.map((n, i) => (
          <View
            key={i}
            style={{ height: WHEEL_ROW }}
            className="items-center justify-center"
          >
            <Text className="font-mono-medium text-h2 text-primary">
              {two(n)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
