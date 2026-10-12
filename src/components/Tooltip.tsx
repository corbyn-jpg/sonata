
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Info } from "lucide-react-native";
import colours from "@/theme/colours";

// A label tip names an icon-only button and shows on a long-press (the button's accessibilityLabel already gives screen
// readers the same name). A popup tip is an "i" that explains an idea. Both stay open until a tap anywhere (or Back),
// so there's time to read them, and only one shows at a time. They're drawn in a native Modal, like the bottom sheets,
// so they always sit above every screen and can't lose the touch to the screens underneath.

const EDGE = 12; // from the screen's edges
const GAP = 8; // between the trigger and the bubble's arrow
const ARROW = 10;

type Anchor = { x: number; y: number; width: number; height: number };
type Tip = { owner: string; kind: "label" | "popup"; text: string; anchor: Anchor };

// One tip for the whole app, shown by <TooltipHost /> in the root layout
let current: Tip | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listen) => listen());
const subscribe = (listen: () => void) => {
  listeners.add(listen);
  return () => listeners.delete(listen);
};
const show = (tip: Tip) => {
  current = tip; // replaces whichever was open
  emit();
};
const hide = (owner?: string) => {
  if (!current || (owner && current.owner !== owner)) return;
  current = null;
  emit();
};

const measure = (view: View | null, then: (anchor: Anchor) => void) =>
  view?.measureInWindow((x, y, width, height) => then({ x, y, width, height }));

/** The keyboard-focus ring (2 pt violet-500, 2 pt out): an outline, so it never moves anything. Shown at once. */
export const focusRing = (focused: boolean): ViewStyle =>
  focused
    ? {
        outlineWidth: 2,
        outlineStyle: "solid",
        outlineColor: colours.violet[500],
        outlineOffset: 2,
      }
    : {};

/**
 Props for an icon-only Pressable: its accessible name, and a label tip on long-press that stays until a tap.
 `IconButton` uses this; reach for it directly only where a Pressable can't be swapped.
 */
export function useTooltip(label: string, disabled = false) {
  const owner = useId();
  const ref = useRef<View>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => () => hide(owner), [owner]);

  return {
    focused,
    props: {
      ref,
      accessibilityLabel: label,
      delayLongPress: 350,
      onLongPress: () => {
        if (disabled) return;
        void Haptics.selectionAsync();
        measure(ref.current, (anchor) =>
          show({ owner, kind: "label", text: label, anchor }),
        );
      },
      onFocus: () => setFocused(true), // keyboard focus: the ring shows at once
      onBlur: () => setFocused(false),
    },
  };
}

type IconButtonProps = Omit<PressableProps, "accessibilityLabel" | "style"> & {
  /** The button's name: its accessibilityLabel and its tooltip. */
  label: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** An icon-only button with an accessible name, a label tip and a focus ring. Every icon-only button uses this. */
export function IconButton({
  label,
  disabled,
  className = "",
  style,
  children,
  accessibilityState,
  ...rest
}: IconButtonProps) {
  const { focused, props } = useTooltip(label, !!disabled);
  return (
    <Pressable
      {...rest}
      {...props}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
      className={className}
      style={[style, focusRing(focused)]}
    >
      {children}
    </Pressable>
  );
}

/** What a mode is: shared by Weekly and Monthly, so both say the same thing. */
export const MODE_TIP =
  "A mode is the set of notes a song is built on. Sonata picks one for each week from that week's notes: Ionian, Lydian, Dorian or Aeolian.";

type PopupTipProps = {
  /** The button's name, e.g. "About modes". */
  label: string;
  /** The explanation: one or two short sentences. */
  text: string;
  disabled?: boolean;
};

/** A small "i" that opens a short explanation of an idea, which stays until it's tapped away. */
export function PopupTip({ label, text, disabled = false }: PopupTipProps) {
  const owner = useId();
  const ref = useRef<View>(null);
  const [focused, setFocused] = useState(false);
  const open = useSyncExternalStore(subscribe, () => current?.owner === owner);

  useEffect(() => () => hide(owner), [owner]);

  const openTip = () => {
    if (open) return;
    measure(ref.current, (anchor) => {
      show({ owner, kind: "popup", text, anchor });
      AccessibilityInfo.announceForAccessibility(text); // read out without moving focus
    });
  };

  return (
    <Pressable
      ref={ref}
      onPress={openTip}
      onLongPress={openTip} // holding it opens it too
      delayLongPress={350}
      disabled={disabled}
      hitSlop={10} // 24 + 2 × 10 = the 44 pt target, without taking 44 pt of room
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Reads a short explanation"
      accessibilityState={{ expanded: open, disabled }}
      className={`h-6 w-6 items-center justify-center rounded-pill active:opacity-60 ${disabled ? "opacity-40" : ""}`}
      style={focusRing(focused)}
    >
      <Info
        color={open ? colours.violet[200] : colours.textMuted}
        size={16}
        strokeWidth={1.5}
      />
    </Pressable>
  );
}

/** Draws whichever tip is open, above everything. Rendered once, in the root layout. */
export function TooltipHost() {
  const tip = useSyncExternalStore(subscribe, () => current);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState<{ tip: Tip; width: number; height: number } | null>(null);

  if (!tip) return null;
  const measured = size?.tip === tip ? size : null;
  const popup = tip.kind === "popup";
  const { anchor } = tip;
  const centre = anchor.x + anchor.width / 2;

  // Below a trigger in the top half (header buttons), above one in the bottom half (the player, tab-level controls)
  const below = anchor.y + anchor.height / 2 < screenHeight / 2;
  const width = measured?.width ?? 0;
  const height = measured?.height ?? 0;
  const left = Math.min(
    Math.max(centre - width / 2, EDGE),
    screenWidth - EDGE - width,
  );
  const top = below
    ? anchor.y + anchor.height + GAP + ARROW / 2
    : Math.max(insets.top + EDGE, anchor.y - GAP - ARROW / 2 - height);
  const arrowLeft = Math.min(Math.max(centre - left - ARROW / 2, 12), width - 12 - ARROW);
  const fill = popup ? colours.surfaceRaised : colours.textPrimary;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (!measured || measured.width !== w || measured.height !== h) setSize({ tip, width: w, height: h });
  };

  const bubble: ReactNode = (
    <Animated.View
      key={tip.owner + tip.kind}
      entering={FadeIn.duration(120).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(90).reduceMotion(ReduceMotion.System)}
      onLayout={onLayout}
      // The label repeats the button's own name, so screen readers skip it; a popup's text is announced on opening
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        position: "absolute",
        left,
        top,
        maxWidth: Math.min(popup ? 280 : 220, screenWidth - EDGE * 2),
        opacity: measured ? 1 : 0, // placed once its size is known
        backgroundColor: fill,
        borderColor: popup ? colours.border : fill,
        pointerEvents: "none",
      }}
      className={`rounded-card border ${popup ? "px-4 py-3" : "px-3 py-1.5"}`}
    >
      <View
        style={{
          position: "absolute",
          left: arrowLeft,
          [below ? "top" : "bottom"]: -ARROW / 2 - 1,
          width: ARROW,
          height: ARROW,
          backgroundColor: fill,
          borderColor: popup ? colours.border : fill,
          borderTopWidth: below ? 1 : 0,
          borderLeftWidth: below ? 1 : 0,
          borderBottomWidth: below ? 0 : 1,
          borderRightWidth: below ? 0 : 1,
          transform: [{ rotate: "45deg" }],
        }}
      />
      <Text
        className={popup ? "font-sans text-caption text-primary" : "font-sans-medium text-caption"}
        style={popup ? undefined : { color: colours.canvas }}
      >
        {tip.text}
      </Text>
    </Animated.View>
  );

  return (
    <Modal
      visible
      transparent
      animationType="none" // the bubble fades itself, and not at all with Reduce Motion
      // Edge to edge like the app, so the trigger's measured position is where the bubble is drawn
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => hide()} // Android's Back closes it, like Escape
    >
      {/* Open until a tap anywhere */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => hide()}
        accessibilityRole="button"
        accessibilityLabel={popup ? "Close explanation" : "Close"}
      />
      {bubble}
    </Modal>
  );
}
