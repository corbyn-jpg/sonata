import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { BottomSheet } from "@/components/BottomSheet";
import { MAX_PIECE_NAME } from "@/lib/pieces";
import colours from "@/theme/colours";

type Props = {
  /** Used if nothing is typed, e.g. "Piece 3". */
  suggestion: string;
  onSave: (name: string) => void;
  onClose: () => void;
};

/** Name a piece the first time it's saved. Mount it only while it's open, so it starts empty each time. */
export function NameSheet({ suggestion, onSave, onClose }: Props) {
  const [name, setName] = useState("");
  const [focused, setFocused] = useState(false);
  const save = () => onSave(name.trim() || suggestion);

  return (
    <BottomSheet visible onClose={onClose} avoidKeyboard>
      <Text
        className="font-mono-medium text-h4 text-primary"
        accessibilityRole="header"
      >
        Name your piece
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus
        placeholder={suggestion}
        placeholderTextColor={colours.textMuted}
        maxLength={MAX_PIECE_NAME}
        returnKeyType="done"
        onSubmitEditing={save}
        accessibilityLabel="Piece name"
        className={`h-12 rounded-card border bg-surface/60 px-4 font-sans text-body text-primary ${focused ? "border-violet-500" : "border-border"}`}
      />
      <View className="gap-3">
        <Pressable
          onPress={save}
          accessibilityRole="button"
          className="min-h-[52px] items-center justify-center rounded-pill bg-violet-700 active:opacity-80"
        >
          <Text className="font-sans-bold text-body text-primary">Save</Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          className="min-h-[44px] items-center justify-center"
        >
          <Text className="font-sans-medium text-body text-secondary">
            Cancel
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
