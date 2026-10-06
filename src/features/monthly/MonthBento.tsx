import { Text, View } from "react-native";
import { BentoCard } from "@/components/BentoCard";
import { MODE_NAMES } from "@/engine";
import colours from "@/theme/colours";
import type { MonthSummary } from "./month";
import { ValenceChart } from "./ValenceChart";

type Props = {
  summary: MonthSummary;
  /** Days in a row up to today (not limited to this month). */
  streak: number;
  /** Whether the month shown is the current one: the streak only means something there. */
  isCurrentMonth: boolean;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The month in four cards: most-used mode (wide), streak and melodies (half), weekly valence (wide). */
export function MonthBento({ summary, streak, isCurrentMonth }: Props) {
  const { mostUsedMode, melodies, weeks } = summary;

  return (
    <View className="gap-3">
      <BentoCard glow={[colours.violet[500], colours.teal[300]]}>
        <Text className="font-sans-medium text-caption text-secondary">Most-used mode</Text>
        <Text className="mt-1 font-mono-medium text-h2 text-primary">
          {mostUsedMode ? MODE_NAMES[mostUsedMode.mode] : "–"}
        </Text>
        <Text className="font-sans text-caption text-muted">
          {mostUsedMode
            ? `${plural(mostUsedMode.weeks, "week")} of ${melodies} with a song`
            : "Your songs' modes will show here"}
        </Text>
      </BentoCard>

      <View className="flex-row gap-3">
        {/* A streak only means something now; an earlier month shows how many days were logged */}
        <BentoCard className="flex-1" glow={[colours.teal[300], colours.teal[700]]}>
          <Text className="font-sans-medium text-caption text-secondary">{isCurrentMonth ? "Streak" : "Days logged"}</Text>
          <Text className="mt-1 font-mono-medium text-h2 text-primary">{isCurrentMonth ? streak : summary.loggedDays}</Text>
          <Text className="font-sans text-caption text-muted">
            {isCurrentMonth ? (streak === 1 ? "day in a row" : "days in a row") : "that month"}
          </Text>
        </BentoCard>
        <BentoCard className="flex-1" glow={[colours.violet[200], colours.violet[700]]}>
          <Text className="font-sans-medium text-caption text-secondary">Melodies</Text>
          <Text className="mt-1 font-mono-medium text-h2 text-primary">{melodies}</Text>
          <Text className="font-sans text-caption text-muted">{isCurrentMonth ? "this month" : "that month"}</Text>
        </BentoCard>
      </View>

      <BentoCard glow={[colours.violet[500], colours.violet[700]]}>
        <Text className="mb-3 font-sans-medium text-caption text-secondary">Weekly valence</Text>
        {weeks.length > 0 ? (
          <ValenceChart weeks={weeks} />
        ) : (
          <Text className="font-sans text-caption text-muted">No weeks start in this month.</Text>
        )}
      </BentoCard>
    </View>
  );
}