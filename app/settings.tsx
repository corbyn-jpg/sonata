import { Switch, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { feelNote } from "@/haptics";
import { setPreference, usePreference } from "@/lib/preferences";
import colours from "@/theme/colours";

export default function Settings() {
  const feelNotes = usePreference("feelNotes");

  const onFeelNotesChange = (on: boolean) => {
    setPreference("feelNotes", on);
    if (on) feelNote("E", "major"); // a sample, so you know what to expect
  };

  return (
    <Screen title="Settings">
      <Text className="mb-1 font-sans-medium text-caption text-secondary">
        Accessibility
      </Text>
      <View className="flex-row items-center gap-4 border-b border-border py-4">
        <View className="flex-1">
          <Text className="font-sans text-body text-primary">Feel notes</Text>
          <Text className="font-sans text-caption text-secondary">
            Each note has its own vibration, so you can feel it as well as hear
            it. More pulses mean a higher note; Low notes feel heavier.
          </Text>
        </View>
        <Switch
          value={feelNotes}
          onValueChange={onFeelNotesChange}
          accessibilityLabel="Feel notes"
          trackColor={{ false: colours.surfaceRaised, true: colours.violet[700] }}
          thumbColor={colours.textPrimary}
        />
      </View>
    </Screen>
  );
}