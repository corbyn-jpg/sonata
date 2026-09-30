import { memo, useEffect, useState } from "react";
import { View } from "react-native";
import { Canvas, Circle, Group, vec } from "@shopify/react-native-skia";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Orb } from "@/components/GlowOrb";
import colours from "@/theme/colours";
import type { DayEntry } from "./useWeek";

const HEIGHT = 44; // room for each dot's glow
const DOT = 14;

type Props = { days: DayEntry[]; todayIndex: number };

/** Monday–Sunday: a small glowing orb per logged day, today outlined until logged. */
export const WeekStrip = memo(function WeekStrip({ days, todayIndex }: Props) {
  const [width, setWidth] = useState(0);
  const logged = days.filter(Boolean).length;
  const slot = width / days.length;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: HEIGHT }}
      accessible
      accessibilityLabel={`This week: ${logged} of 7 days checked in`}
    >
      {width > 0 && (
        <Canvas style={{ width, height: HEIGHT }}>
          {days.map((day, i) => (
            <Dot
              key={i}
              x={slot * (i + 0.5)}
              y={HEIGHT / 2}
              day={day}
              isToday={i === todayIndex}
              isFuture={i > todayIndex}
            />
          ))}
        </Canvas>
      )}
    </View>
  );
});

type DotProps = {
  x: number;
  y: number;
  day: DayEntry;
  isToday: boolean;
  isFuture: boolean;
};

function Dot({ x, y, day, isToday, isFuture }: DotProps) {
  // Blooms in when today's check-in is saved; already-logged days start fully grown
  const bloom = useSharedValue(day ? 1 : 0);
  useEffect(() => {
    bloom.value = withTiming(day ? 1 : 0, {
      duration: 400,
      easing: Easing.out(Easing.quad),
    });
  }, [day, bloom]);
  const transform = useDerivedValue(() => [{ scale: bloom.value }]);

  if (day) {
    const { core, edge } = colours.orb[day.note][day.mode];
    return (
      <Group transform={transform} origin={vec(x, y)}>
        <Orb cx={x} cy={y} size={DOT} core={core} edge={edge} />
      </Group>
    );
  }
  if (isToday) {
    return (
      <Circle
        cx={x}
        cy={y}
        r={DOT / 2}
        style="stroke"
        strokeWidth={1.5}
        color={colours.violet[200]}
        opacity={0.8}
      />
    );
  }
  if (isFuture) {
    return (
      <Circle
        cx={x}
        cy={y}
        r={DOT / 2}
        style="stroke"
        strokeWidth={1}
        color={colours.border}
      />
    );
  }
  // A missed day: present but quiet — no red, no gaps that shout
  return (
    <Circle cx={x} cy={y} r={2.5} color={colours.textMuted} opacity={0.4} />
  );
}