import { Pressable, Text, View } from "react-native";
import { Moon, Sun } from "lucide-react-native";
import type { Mode } from "@/data/notes";
import colours from "@/theme/colours";

const OPTIONS = [
  { mode: "major", label: "Bright", Icon: Sun },
  { mode: "minor", label: "Dark", Icon: Moon },
] as const;

type Props = { mode: Mode; onChange: (mode: Mode) => void };

/** Bright (major) / Dark (minor) switch. A radio group, so screen readers announce both options. */
export function ModeToggle({ mode, onChange }: Props) {
  return (
    <View
      accessibilityRole="radiogroup"
      className="flex-row self-center rounded-pill border border-border bg-surface/60 p-1"
    >
      {OPTIONS.map(({ mode: option, label, Icon }) => {
        const active = option === mode;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            hitSlop={4} // 36 + 2×4 = the 44 pt minimum tap target
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`${label} page`}
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