import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useIsFocused } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Sky } from "@/components/Sky";
import { MonthCalendar } from "@/features/monthly/MonthCalendar";
import { addMonths, monthTitle, startOfMonth } from "@/features/monthly/month";
import { useMonth } from "@/features/monthly/useMonth";
import colours from "@/theme/colours";

export default function Monthly() {
  const isFocused = useIsFocused();
  const [today] = useState(() => new Date());
  const thisMonth = startOfMonth(today);
  const [month, setMonth] = useState(thisMonth);
  const { loading, summary } = useMonth(month);
  const atLatest = month.getTime() >= thisMonth.getTime(); // nothing to show in future months

  const header = (
    <View className="mb-6 flex-row items-center justify-between">
      <Pressable
        onPress={() => setMonth(addMonths(month, -1))}
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        className="h-11 w-11 items-center justify-center"
      >
        <ChevronLeft color={colours.textSecondary} size={24} strokeWidth={1.5} />
      </Pressable>
      <Text className="font-mono-medium text-h3 text-primary" accessibilityRole="header">
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
        <ChevronRight color={colours.textSecondary} size={24} strokeWidth={1.5} />
      </Pressable>
    </View>
  );

  return (
    <Screen header={header} background={<Sky animated={isFocused} pace={1.6} />}>
      <ScrollView contentContainerClassName="gap-6 pb-32" showsVerticalScrollIndicator={false}>
        {loading || !summary ? (
          <ActivityIndicator color={colours.violet[200]} />
        ) : (
          <MonthCalendar month={month} days={summary.days} today={today} />
        )}
      </ScrollView>
    </Screen>
  );
}