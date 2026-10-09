import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import colours from "@/theme/colours";

type Props = {
  label: string;
  value: string;
  onChange: (text: string) => void;
  /** Shown under the box, e.g. why it can't be used yet. */
  note?: string | null;
  editable?: boolean;
  onSubmit?: () => void;
};

/** A passphrase box, hidden by default, with an eye to show what's been typed. */
export function PassphraseField({
  label,
  value,
  onChange,
  note,
  editable = true,
  onSubmit,
}: Props) {
  const [shown, setShown] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-2">
      <Text className="font-sans-medium text-caption text-secondary">
        {label}
      </Text>
      <View
        className={`h-12 flex-row items-center rounded-card border pl-4 ${focused ? "border-violet-500" : "border-border"}`}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={!shown}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="no" // the phone's password manager shouldn't offer to save it
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          accessibilityLabel={label}
          className="h-full flex-1 font-sans text-body text-primary"
        />
        <Pressable
          onPress={() => setShown(!shown)}
          accessibilityRole="button"
          accessibilityLabel={shown ? "Hide passphrase" : "Show passphrase"}
          className="h-12 w-12 items-center justify-center active:opacity-60"
        >
          {shown ? (
            <EyeOff color={colours.textSecondary} size={20} strokeWidth={1.5} />
          ) : (
            <Eye color={colours.textSecondary} size={20} strokeWidth={1.5} />
          )}
        </Pressable>
      </View>
      {note && (
        <Text
          className="font-sans text-caption text-secondary"
          accessibilityLiveRegion="polite"
        >
          {note}
        </Text>
      )}
    </View>
  );
}
