import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Share2 } from "lucide-react-native";
import { BottomSheet } from "@/components/BottomSheet";
import colours from "@/theme/colours";

const MAX_LENGTH = 200;

type Props = {
  visible: boolean;
  onShare: (caption: string) => void;
  onClose: () => void;
};

/**
 An optional message to send with the song. It goes to the share sheet with the file and is never saved, in the app or anywhere else.
 */
export function ShareSheet({ visible, onShare, onClose }: Props) {
  const [caption, setCaption] = useState("");

  const share = () => {
    onShare(caption);
    setCaption(""); // a fresh message next time (closing without sharing keeps the draft)
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard>
      <View className="gap-1">
        <Text className="font-mono-medium text-h4 text-primary">
          Share your song
        </Text>
        <Text className="font-sans text-body text-secondary">
          Add a message to send with it, if you like.
        </Text>
      </View>
      <View className="gap-1">
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Write a message (optional)"
          placeholderTextColor={colours.textMuted}
          maxLength={MAX_LENGTH}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Message"
          className="min-h-[96px] rounded-card border border-border bg-surface/60 px-4 py-3 font-sans text-body text-primary"
        />
        <Text className="self-end font-sans text-caption text-muted">
          {caption.length}/{MAX_LENGTH}
        </Text>
      </View>
      <Pressable
        onPress={share}
        accessibilityRole="button"
        className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-pill bg-violet-700"
      >
        <Share2 color={colours.textPrimary} size={18} strokeWidth={1.5} />
        <Text className="font-sans-bold text-body text-primary">Share</Text>
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
    </BottomSheet>
  );
}
