import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import colours from "@/theme/colours";

type Props = {
  title: string;
  /** Anything to show on the right, e.g. an icon button. */ right?: ReactNode;
};

/** A back arrow and the screen's title, for screens opened from a tab (Oasis tools, Settings…). */
export function BackHeader({ title, right }: Props) {
  return (
    <View className="mb-6 flex-row items-center gap-2">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back"
        className="-ml-3 h-11 w-11 items-center justify-center"
      >
        <ChevronLeft
          color={colours.textSecondary}
          size={24}
          strokeWidth={1.5}
        />
      </Pressable>
      <Text
        className="flex-1 font-mono-medium text-h3 text-primary"
        accessibilityRole="header"
        numberOfLines={1}
      >
        {title}
      </Text>
      {right}
    </View>
  );
}
