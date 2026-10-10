import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react-native";
import colours from "@/theme/colours";

// A flat capsule with back and forward at its ends. While the song plays, the round play button rises half out of it in the week's colour; paused, it sinks back into the slot. Still and quiet, so the spinning disc above stays the thing to look at.
const WIDTH = 216;
const BOX = 65; // the capsule's height
const BUTTON = 60; // the play button's diameter when raised
const LIFT = BUTTON / 2; // raised: the button's centre sits on the capsule's top edge
const HEIGHT = BOX + LIFT;
const SLOTTED = 44 / BUTTON; // paused: small enough to sit inside the capsule
const MOVE = { duration: 300, easing: Easing.out(Easing.quad) };

/** How bright a colour looks, 0–1 (WCAG relative luminance). */
function luminance(hex: string) {
  const n = parseInt(hex.slice(1, 7), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

type Props = {
  playing: boolean;
  disabled?: boolean;
  canGoForward: boolean;
  /** The week's main orb colours: the play button takes the brighter of the two, so a dark week isn't muddy. */
  orb: { core: string; edge: string };
  onToggle: () => void;
  onBack: () => void;
  onForward: () => void;
};

/** Back a day / play-pause / forward a day, as one capsule rather than three separate buttons. */
export function SongTransport({
  playing,
  disabled,
  canGoForward,
  orb,
  onToggle,
  onBack,
  onForward,
}: Props) {
  const fill = luminance(orb.core) >= luminance(orb.edge) ? orb.core : orb.edge;
  const iconColour =
    luminance(fill) > 0.3 ? colours.canvas : colours.textPrimary; // dark on a light button, light on a dark one

  // 1 = raised (playing), 0 = slotted in (paused). Reanimated skips straight to the end with Reduce Motion on.
  const raised = useSharedValue(playing ? 1 : 0);
  useEffect(() => {
    raised.set(withTiming(playing ? 1 : 0, MOVE));
  }, [playing, raised]);

  const button = useAnimatedStyle(() => {
    const t = raised.get();
    return {
      transform: [
        { translateY: (1 - t) * (BOX / 2) }, // from the capsule's top edge down to its middle
        { scale: SLOTTED + (1 - SLOTTED) * t },
      ],
    };
  });
  // The glow only shows while it's raised
  const glow = useAnimatedStyle(() => ({ opacity: raised.get() }));

  const side = (
    label: string,
    Icon: typeof SkipBack,
    onPress: () => void,
    enabled: boolean,
  ) => (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      hitSlop={4}
      className={`h-12 w-12 items-center justify-center rounded-card active:opacity-60 ${enabled ? "" : "opacity-40"}`}
    >
      <Icon
        color={colours.violet[200]}
        fill={colours.violet[200]}
        size={22}
        strokeWidth={1.5}
      />
    </Pressable>
  );

  return (
    <View style={{ width: WIDTH, height: HEIGHT }}>
      {/* The capsule, at the bottom; the raised button needs the space above it */}
      <View
        className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between rounded-card border border-border bg-surface px-1.5"
        style={{ height: BOX }}
      >
        {side("Back a day", SkipBack, onBack, !disabled)}
        {side(
          "Forward a day",
          SkipForward,
          onForward,
          !disabled && canGoForward,
        )}
      </View>

      <Animated.View
        style={[
          {
            position: "absolute",
            top: LIFT - BUTTON / 2, // raised, its centre is on the capsule's top edge
            left: (WIDTH - BUTTON) / 2,
            width: BUTTON,
            height: BUTTON,
          },
          button,
        ]}
      >
        {/* A soft glow in the week's colour under the raised button */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: BUTTON / 2,
              backgroundColor: fill,
              boxShadow: `0 6px 20px ${fill}88`,
            },
            glow,
          ]}
        />
        <Pressable
          onPress={onToggle}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pause" : "Play"}
          accessibilityState={{ disabled: !!disabled }}
          className={`h-full w-full items-center justify-center rounded-pill active:opacity-80 ${disabled ? "opacity-50" : ""}`}
          style={{ backgroundColor: fill }}
        >
          {playing ? (
            <Pause
              color={iconColour}
              fill={iconColour}
              size={24}
              strokeWidth={1.5}
            />
          ) : (
            <Play
              color={iconColour}
              fill={iconColour}
              size={30}
              strokeWidth={1.5}
              style={{ marginLeft: 3 }} // a play triangle looks centred a little right of centre
            />
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}
