import { Pressable, Text, View } from "react-native";
import { Music2, Music4 } from "lucide-react-native";
import type { Mode } from "@/data/notes";
import colours from "@/theme/colours";

// Named for what they are musically. "Bright" and "Dark" with a sun and moon read as light/dark
// mode in user testing, so the labels say Major and Minor and the icons are notes, not a theme.
const OPTIONS = [
  {
    mode: "major",
    label: "Major",
    hint: "Orbs play major chords",
    Icon: Music2,
  },
  {
    mode: "minor",
    label: "Minor",
    hint: "Orbs play minor chords",
    Icon: Music4,
  },
] as const;

type Props = { mode: Mode; onChange: (mode: Mode) => void };

/** Major / Minor switch. A radio group, so screen readers announce both options. */
export function ModeToggle({ mode, onChange }: Props) {
  return (
    <View
      accessibilityRole="radiogroup"
      className="flex-row self-center rounded-pill border border-border bg-surface/60 p-1"
    >
      {OPTIONS.map(({ mode: option, label, hint, Icon }) => {
        const active = option === mode;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            hitSlop={4} // 36 + 2×4 = the 44 pt minimum tap target
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={label}
            accessibilityHint={hint}
            className={`h-9 flex-row items-center gap-2 rounded-pill px-4 ${active ? "bg-violet-700" : ""}`}
          >
            <Icon
              color={active ? colours.textPrimary : colours.textMuted}
              size={16}
              strokeWidth={1.5}
            />
            <Text
              className={`font-sans-medium text-caption ${active ? "text-primary" : "text-muted"}`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
