import { useState } from "react";
import { Text, View } from "react-native";
import {
  BlurMask,
  Canvas,
  Circle,
  Line,
  Path,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import colours from "@/theme/colours";
import { shortDate, type MonthWeek } from "./month";

const HEIGHT = 96;
const PAD = 14; // keeps the end points' glow inside the chart

/** Valence 1–10 → y, with 10 at the top. */
const yOf = (valence: number) =>
  PAD + ((10 - valence) / 9) * (HEIGHT - 2 * PAD);

/**
 One point per week: thin lines and glowing points, not bars. A week without check-ins leaves a gap rather than a zero.
 */
export function ValenceChart({ weeks }: { weeks: readonly MonthWeek[] }) {
  const [width, setWidth] = useState(0);
  const xOf = (i: number) =>
    weeks.length === 1
      ? width / 2
      : PAD + (i * (width - 2 * PAD)) / (weeks.length - 1);
  const points = weeks.map((w, i) =>
    w.averageValence === null ? null : { x: xOf(i), y: yOf(w.averageValence) },
  );

  // The line joins neighbouring weeks that both have check-ins
  const path = Skia.PathBuilder.Make();
  points.forEach((p, i) => {
    if (!p) return;
    if (points[i - 1]) path.lineTo(p.x, p.y);
    else path.moveTo(p.x, p.y);
  });

  const described = weeks
    .map(
      (w) =>
        `week of ${shortDate(w.start)}: ${w.averageValence === null ? "no check-ins" : w.averageValence.toFixed(1)}`,
    )
    .join("; ");

  return (
    <View
      accessible
      accessibilityLabel={`Weekly valence, from 1 to 10. ${described}`}
    >
      <View
        style={{ height: HEIGHT }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 && (
          <Canvas style={{ width, height: HEIGHT }}>
            {[1, 5.5, 10].map((v) => (
              <Line
                key={v}
                p1={vec(0, yOf(v))}
                p2={vec(width, yOf(v))}
                color={colours.border}
                strokeWidth={1}
                opacity={0.5}
              />
            ))}
            <Path
              path={path.build()}
              style="stroke"
              strokeWidth={1.5}
              color={colours.violet[200]}
              opacity={0.8}
            />
            {points.map(
              (p, i) =>
                p && [
                  <Circle
                    key={`${i}-glow`}
                    cx={p.x}
                    cy={p.y}
                    r={7}
                    color={colours.violet[500]}
                    opacity={0.7}
                  >
                    <BlurMask blur={5} style="normal" />
                  </Circle>,
                  <Circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={3.5}
                    color={colours.textPrimary}
                  />,
                ],
            )}
          </Canvas>
        )}
      </View>
      <View
        className="mt-1 flex-row justify-between"
        importantForAccessibility="no-hide-descendants"
      >
        {weeks.map((w) => (
          <Text
            key={w.start.getTime()}
            className="font-sans text-[11px] text-muted"
          >
            {shortDate(w.start)}
          </Text>
        ))}
      </View>
    </View>
  );
}
