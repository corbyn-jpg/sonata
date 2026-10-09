import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { Settings } from "lucide-react-native";
import colours from "@/theme/colours";

type Props = {
  title: string;
  /** What sits under the title: the dates, the month's arrows, a line of context. */
  children?: ReactNode;
  className?: string;
};

/**
 The top of every tab: its title on the left and the settings gear on the right, in exactly the same place on every
 tab, so it's found once and then found by habit.
 */
export function TabHeader({
  title,
  children,
  className = "mb-6 gap-1",
}: Props) {
  return (
    <View className={className}>
      <View className="flex-row items-center justify-between gap-2">
        <Text
          numberOfLines={1}
          accessibilityRole="header"
          className="shrink font-mono-medium text-h3 text-primary"
        >
          {title}
        </Text>
        <Link href="/settings" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            // The icon's edge lines up with the screen margin; the tap area reaches into it
            className="-mr-2.5 h-11 w-11 items-center justify-center active:opacity-60"
          >
            <Settings
              color={colours.textSecondary}
              size={24}
              strokeWidth={1.5}
            />
          </Pressable>
        </Link>
      </View>
      {children}
    </View>
  );
}
