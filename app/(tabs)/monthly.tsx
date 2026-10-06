import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useIsFocused } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Sky } from "@/components/Sky";
import { MonthBento } from "@/features/monthly/MonthBento";
import { MonthCalendar } from "@/features/monthly/MonthCalendar";
import { MonthSongCard } from "@/features/monthly/MonthSongCard";
import { addMonths, monthTitle, startOfMonth } from "@/features/monthly/month";
import { useMonth } from "@/features/monthly/useMonth";
import { WeeksShelf } from "@/features/monthly/WeeksShelf";
import { dayKey } from "@/lib/dates";
import colours from "@/theme/colours";

export default function Monthly() {
  const isFocused = useIsFocused();
  const [today] = useState(() => new Date());
  const thisMonth = startOfMonth(today);
  const [month, setMonth] = useState(thisMonth);
  const { loading, summary, streak } = useMonth(month);
  const atLatest = month.getTime() >= thisMonth.getTime(); // nothing to show in future months

  const header = (
    <View className="mb-6 flex-row items-center justify-between">
      <Pressable
        onPress={() => setMonth(addMonths(month, -1))}
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        className="h-11 w-11 items-center justify-center"
      >
        <ChevronLeft
          color={colours.textSecondary}
          size={24}
          strokeWidth={1.5}
        />
      </Pressable>
      <Text
        className="font-mono-medium text-h3 text-primary"
        accessibilityRole="header"
      >
        {monthTitle(month)}
      </Text>
      <Pressable
        onPress={() => setMonth(addMonths(month, 1))}
        disabled={atLatest}
        accessibilityRole="button"
        accessibilityLabel="Next month"
        accessibilityState={{ disabled: atLatest }}
        className={`h-11 w-11 items-center justify-center ${atLatest ? "opacity-30" : ""}`}
      >
        <ChevronRight
          color={colours.textSecondary}
          size={24}
          strokeWidth={1.5}
        />
      </Pressable>
    </View>
  );

  return (
    <Screen
      header={header}
      background={<Sky animated={isFocused} pace={1.6} />}
    >
      <ScrollView
        contentContainerClassName="gap-6 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {loading || !summary ? (
          <ActivityIndicator color={colours.violet[200]} />
        ) : (
          <>
            <MonthCalendar month={month} days={summary.days} today={today} />
            <MonthBento
              summary={summary}
              streak={streak}
              isCurrentMonth={atLatest}
            />
            {summary.melodies > 0 && (
              <MonthSongCard
                key={`song-${dayKey(month)}`}
                month={month}
                weeks={summary.weeks}
              />
            )}
            {/* Keyed by month, so changing month stops whatever was playing */}
            <WeeksShelf
              key={dayKey(month)}
              weeks={summary.weeks}
              today={today}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
