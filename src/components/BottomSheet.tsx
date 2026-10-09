import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  type AccessibilityRole,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SPACE = 5; // breathing room between the sheet's last control and the navigation bar

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Layout inside the sheet (gap, side and top padding). The bottom padding is set here, from the phone. */
  className?: string;
  /** Lift the sheet above the keyboard, for sheets with a text box. */
  avoidKeyboard?: boolean;
  accessibilityRole?: AccessibilityRole;
};

/**
 A sheet that rises from the bottom over a dimmed backdrop; tapping the backdrop closes it. Every sheet in the app uses this. Android draws apps edge to edge, under the navigation bar (gestures or the three buttons), and the bar's height differs between phones, so the bottom padding is the bar's real height plus SPACE rather than a fixed number: nothing ever sits under the bar.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  className = "gap-4 px-6 pt-6",
  avoidKeyboard = false,
  accessibilityRole,
}: Props) {
  const insets = useSafeAreaInsets();

  const sheet = (
    <Pressable
      className="flex-1 justify-end bg-canvas/70"
      onPress={onClose}
      accessibilityLabel="Close"
    >
      <Pressable
        onPress={() => {}} // taps on the sheet itself don't close it
        accessibilityViewIsModal
        accessibilityRole={accessibilityRole}
        className={`rounded-t-card border border-border bg-surface-raised ${className}`}
        style={{ paddingBottom: insets.bottom + SPACE }}
      >
        {children}
      </Pressable>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Always edge to edge, on every phone, so the inset above is always the right amount
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {avoidKeyboard ? (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          {sheet}
        </KeyboardAvoidingView>
      ) : (
        sheet
      )}
    </Modal>
  );
}
