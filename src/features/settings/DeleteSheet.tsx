import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { BottomSheet } from "@/components/BottomSheet";
import {
  BackupUnreachable,
  CONFIRM_WORD,
  deleteEverything,
  isConfirmed,
} from "@/lib/deleteEverything";
import { wipe } from "@/lib/wipe";
import colours from "@/theme/colours";

type Props = { onClose: () => void };
type State = "idle" | "deleting" | "unreachable" | "failed";

const ERRORS: Record<"unreachable" | "failed", string> = {
  unreachable:
    "Couldn't reach your backup, so nothing was deleted. Check your connection and try again.",
  failed:
    "Something went wrong part-way through. Try again and anything left will be deleted.",
};

/**
 Delete all data: permanent, so it's confirmed by typing the word rather than tapping OK. The button is muted red text on an outline (never a solid red button). Success needs no message: Sonata restarts, fresh.
 */
export function DeleteSheet({ onClose }: Props) {
  const [typed, setTyped] = useState("");
  const [focused, setFocused] = useState(false);
  const [state, setState] = useState<State>("idle");
  const deleting = state === "deleting";
  const ready = isConfirmed(typed) && !deleting;

  const confirm = async () => {
    if (!ready) return;
    setState("deleting");
    try {
      await deleteEverything(wipe); // the app restarts at the end
    } catch (error) {
      setState(error instanceof BackupUnreachable ? "unreachable" : "failed");
    }
  };

  const close = () => {
    if (!deleting) onClose();
  };

  return (
    // Tapping outside the sheet closes it, unless it's part-way through deleting
    <BottomSheet
      visible
      onClose={close}
      avoidKeyboard
      className="gap-5 px-6 pt-6"
    >
      <View className="gap-2">
        <Text
          className="font-mono-medium text-h4 text-primary"
          accessibilityRole="header"
        >
          Delete everything?
        </Text>
        <Text className="font-sans text-body text-secondary">
          Your check-ins, thought records and playlists are deleted from this
          phone and from the encrypted backup, and Sonata starts again fresh.
          This can&apos;t be undone.
        </Text>
        <Text className="font-sans text-caption text-muted">
          Want a copy first? Use Export my data.
        </Text>
      </View>

      <View className="gap-2">
        <Text className="font-sans-medium text-caption text-secondary">
          Type {CONFIRM_WORD} to confirm
        </Text>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!deleting}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => void confirm()}
          accessibilityLabel={`Type ${CONFIRM_WORD} to confirm`}
          placeholder={CONFIRM_WORD}
          placeholderTextColor={colours.textMuted}
          className={`h-12 rounded-card border px-4 font-mono text-body text-primary ${focused ? "border-violet-500" : "border-border"}`}
        />
      </View>

      <View className="gap-3">
        <Pressable
          onPress={() => void confirm()}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready, busy: deleting }}
          className={`min-h-[52px] flex-row items-center justify-center gap-2 rounded-pill border active:opacity-80 ${ready || deleting ? "" : "opacity-40"}`}
          style={{ borderColor: colours.danger }}
        >
          {deleting && <ActivityIndicator color={colours.danger} />}
          <Text
            className="font-sans-bold text-body"
            style={{ color: colours.danger }}
          >
            {deleting ? "Deleting…" : "Delete everything"}
          </Text>
        </Pressable>
        {(state === "unreachable" || state === "failed") && (
          <Text
            className="font-sans text-caption"
            style={{ color: colours.danger }}
            accessibilityLiveRegion="polite"
          >
            {ERRORS[state]}
          </Text>
        )}
        <Pressable
          onPress={close}
          disabled={deleting}
          accessibilityRole="button"
          className={`min-h-[44px] items-center justify-center ${deleting ? "opacity-40" : ""}`}
        >
          <Text className="font-sans-medium text-body text-secondary">
            Keep my data
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
