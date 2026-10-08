import { Pressable, Text, View } from "react-native";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colours from "@/theme/colours";

/**
 The tab bar from the mockups: a floating capsule inset from the screen edges, rather than the stock edge-to-edge
 bar. The current tab sits on a lighter pill.
 */
export function CapsuleTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-canvas px-6 pt-2"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      <View className="flex-row rounded-pill border border-border bg-surface p-1.5">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label =
            typeof options.title === "string" ? options.title : route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented)
              navigation.navigate(route.name, route.params);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              className={`min-h-[55px] flex-1 items-center justify-center gap-0.5 rounded-pill py-1 ${focused ? "bg-surface-raised" : ""}`}
            >
              {options.tabBarIcon?.({
                focused,
                color: focused ? colours.violet[200] : colours.textMuted,
                size: 22,
              })}
              <Text
                numberOfLines={1}
                className={`font-sans-medium text-caption ${focused ? "text-violet-200" : "text-muted"}`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
