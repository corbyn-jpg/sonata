import { Modal, Pressable, Text, View } from "react-native";
import { Wind } from "lucide-react-native";
import colours from "@/theme/colours";

type Props = {
  visible: boolean;
  onGround: () => void;
  onDismiss: () => void;
};

/**
 A quiet, optional offer after a heavy run of days. No diagnosis, no labels, no questions: the user can take a moment to breathe or simply carry on, and nothing is asked again that week.
 */
export function LowMoodSheet({ visible, onGround, onDismiss }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      {/* Tapping outside the sheet closes it */}
      <Pressable
        className="flex-1 justify-end bg-canvas/50"
        onPress={onDismiss}
        accessibilityLabel="Close"
      >
        <Pressable
          onPress={() => {}}
          accessibilityViewIsModal
          className="gap-4 rounded-t-card border border-border bg-surface-raised px-6 pb-12 pt-6"
        >
          <View className="h-11 w-11 items-center justify-center rounded-pill bg-teal-700/30">
            <Wind color={colours.teal[300]} size={22} strokeWidth={1.5} />
          </View>
          <View className="gap-1">
            <Text className="font-mono-medium text-h4 text-primary">
              Notice a heavy rhythm this week?
            </Text>
            <Text className="font-sans text-body text-secondary">
              Want a moment to ground yourself?
            </Text>
          </View>
          <Pressable
            onPress={onGround}
            accessibilityRole="button"
            className="min-h-[52px] items-center justify-center rounded-pill bg-teal-700"
          >
            <Text className="font-sans-bold text-body text-primary">
              Grounding ritual
            </Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            className="min-h-[44px] items-center justify-center"
          >
            <Text className="font-sans-medium text-body text-secondary">
              Not now
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
