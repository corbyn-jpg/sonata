import { Pressable, ScrollView, Text, View } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";
import { Pause, Play } from "lucide-react-native";
import { BackHeader } from "@/components/BackHeader";
import { Screen } from "@/components/Screen";
import { CALMING_SOUNDS } from "@/features/oasis/calmingSounds";
import { useCalmingSound } from "@/features/oasis/useCalmingSound";
import colours from "@/theme/colours";

/** Shown if the sounds can't load, instead of a blank screen. Trying again remounts the screen with a new player. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Screen header={<BackHeader title="Calming sounds" />}>
      <View className="flex-1 justify-center gap-6 pb-20">
        <Text className="text-center font-sans text-body text-secondary">
          The sounds couldn’t be loaded just now.
        </Text>
        <Pressable
          onPress={retry}
          accessibilityRole="button"
          className="min-h-[52px] items-center justify-center rounded-pill bg-violet-700"
        >
          <Text className="font-sans-bold text-body text-primary">Try again</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

/** Calming sounds: one ambient loop at a time. The whole row is the button, so it's easy to hit. */
export default function CalmingSounds() {
  const { current, playing, toggle } = useCalmingSound();

  return (
    <Screen header={<BackHeader title="Calming sounds" />}>
      <ScrollView contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        <Text className="mb-4 font-sans text-body text-secondary">
          Pick one to play on a loop. It stops when you leave this screen.
        </Text>

        {CALMING_SOUNDS.map((sound) => {
          const on = sound.id === current && playing;
          const Icon = on ? Pause : Play;
          return (
            <Pressable
              key={sound.id}
              onPress={() => toggle(sound)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${on ? "Pause" : "Play"} ${sound.name}`}
              accessibilityHint={sound.about}
              className="min-h-[72px] flex-row items-center gap-4 border-t border-border py-4 active:opacity-80"
            >
              <View className="flex-1 gap-0.5">
                <Text className={`font-mono-medium text-body ${on ? "text-violet-200" : "text-primary"}`}>
                  {sound.name}
                </Text>
                <Text className="font-sans text-caption text-secondary">{on ? "Playing · on a loop" : sound.about}</Text>
              </View>
              <View
                className={`h-11 w-11 items-center justify-center rounded-full ${on ? "bg-violet-700" : "border border-border"}`}
              >
                <Icon
                  color={on ? colours.textPrimary : colours.textSecondary}
                  fill={on ? colours.textPrimary : "transparent"}
                  size={16}
                  strokeWidth={1.5}
                />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}