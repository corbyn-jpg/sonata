import { Text, View } from "react-native";
import { BentoCard } from "@/components/BentoCard";
import { MODE_NAMES } from "@/engine";
import type { MonthSummary } from "./month";
import { ValenceChart } from "./ValenceChart";

type Props = {
  summary: MonthSummary;
  /** Days in a row up to today (not limited to this month). */
  streak: number;
  /** Whether the month shown is the current one: the streak only means something there. */
  isCurrentMonth: boolean;
};

/** One figure in the line under the chart: the value, and a few words on what it counts. */
function Figure({ value, label, first = false }: { value: string | number; label: string; first?: boolean }) {
  return (
    <View className={`flex-1 gap-0.5 ${first ? "" : "border-l border-border pl-3"}`}>
      <Text numberOfLines={1} className="font-mono-medium text-h4 text-primary">
        {value}
      </Text>
      <Text className="font-sans text-caption text-muted">{label}</Text>
    </View>
  );
}

/**
 The month in one card: the week-by-week line gets the room, and the month's figures sit under it as a single
 line of text rather than a row of matching stat tiles.
 */
export function MonthBento({ summary, streak, isCurrentMonth }: Props) {
  const { mostUsedMode, melodies, weeks } = summary;
  // A streak only means something now; an earlier month shows how many days were logged
  const days = isCurrentMonth ? streak : summary.loggedDays;
  const daysLabel = isCurrentMonth ? (streak === 1 ? "day in a row" : "days in a row") : "days logged";

  return (
    <BentoCard className="gap-4">
      <View className="gap-3">
        <Text className="font-sans-medium text-caption text-secondary">Week by week</Text>
        {weeks.length > 0 ? (
          <ValenceChart weeks={weeks} />
        ) : (
          <Text className="font-sans text-caption text-muted">No weeks start in this month.</Text>
        )}
      </View>

      <View className="flex-row gap-3 border-t border-border pt-4">
        <Figure
          first
          value={mostUsedMode ? MODE_NAMES[mostUsedMode.mode] : "–"}
          label={mostUsedMode ? `mode in ${mostUsedMode.weeks} of ${melodies} weeks` : "mode"}
        />
        <Figure value={days} label={daysLabel} />
        <Figure value={melodies} label={melodies === 1 ? "melody" : "melodies"} />
      </View>
    </BentoCard>
  );
}
