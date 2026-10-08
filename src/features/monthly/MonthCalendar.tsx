import { useState } from "react";
import { Text, View } from "react-native";
import { Canvas, Circle } from "@shopify/react-native-skia";
import { Orb } from "@/components/GlowOrb";
import type { DayNote } from "@/engine/theory";
import { dayKey } from "@/lib/dates";
import colours from "@/theme/colours";
import { monthGrid } from "./month";

const ROW = 52; // height of one week row
const DOT = 20; // a logged day's orb
const DOT_Y = 18; // centre of the dot within its row; the date sits underneath
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type Props = {
  month: Date;
  /** Check-ins by day key. */
  days: ReadonlyMap<string, DayNote>;
  today: Date;
};

/**
 The month as glowing dots: a logged day shows its orb, a missed day a faint outline, and today a ring. One Skia canvas draws every dot; the dates and accessibility labels are ordinary views laid over it.
 */
export function MonthCalendar({ month, days, today }: Props) {
  const [width, setWidth] = useState(0);
  const rows = monthGrid(month);
  const cell = width / 7;
  const todayKey = dayKey(today);

  return (
    <View
      className="w-full"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View className="mb-2 flex-row">
        {WEEKDAYS.map((d, i) => (
          <Text
            key={i}
            className="flex-1 text-center font-sans text-caption text-muted"
            importantForAccessibility="no"
          >
            {d}
          </Text>
        ))}
      </View>

      <View style={{ height: rows.length * ROW }}>
        {width > 0 && (
          <Canvas
            style={{ position: "absolute", width, height: rows.length * ROW }}
          >
            {rows.flatMap((row, r) =>
              row.map((date, c) => {
                if (!date) return null;
                const key = dayKey(date);
                const cx = (c + 0.5) * cell;
                const cy = r * ROW + DOT_Y;
                const checkin = days.get(key);
                const ring = key === todayKey && (
                  <Circle
                    key={`${key}-ring`}
                    cx={cx}
                    cy={cy}
                    r={DOT / 2 + 5}
                    style="stroke"
                    strokeWidth={1.5}
                    color={colours.violet[200]}
                  />
                );
                if (!checkin) {
                  return [
                    <Circle
                      key={key}
                      cx={cx}
                      cy={cy}
                      r={DOT / 2 - 1}
                      style="stroke"
                      strokeWidth={1}
                      color={colours.border}
                    />,
                    ring,
                  ];
                }
                const { core, edge } = colours.orb[checkin.note][checkin.mode];
                return [
                  <Orb
                    key={key}
                    cx={cx}
                    cy={cy}
                    size={DOT}
                    core={core}
                    edge={edge}
                    glow={0.7}
                  />,
                  ring,
                ];
              }),
            )}
          </Canvas>
        )}

        {rows.map((row, r) => (
          <View key={r} className="flex-row" style={{ height: ROW }}>
            {row.map((date, c) => {
              if (!date) return <View key={c} className="flex-1" />;
              const key = dayKey(date);
              const isToday = key === todayKey;
              const label = `${DAY_NAMES[date.getDay()]} ${date.getDate()}${isToday ? ", today" : ""}, ${days.has(key) ? "checked in" : "no check-in"}`;
              return (
                <View
                  key={c}
                  className="flex-1 items-center"
                  accessible
                  accessibilityLabel={label}
                >
                  <Text
                    style={{ marginTop: DOT_Y + DOT / 2 + 6 }}
                    className={`font-sans text-[11px] ${isToday ? "text-primary" : "text-muted"}`}
                  >
                    {date.getDate()}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
