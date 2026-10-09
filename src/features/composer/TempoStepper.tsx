import { Pressable, Text, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { MAX_TEMPO, MIN_TEMPO } from "@/engine";
import colours from "@/theme/colours";

const STEP = 4;

type Props = { tempo: number; onChange: (tempo: number) => void };

/** Tempo in beats per minute, 60 to 160 in steps of 4. One adjustable control for screen readers. */
export function TempoStepper({ tempo, onChange }: Props) {
  const change = (by: number) =>
    onChange(Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, tempo + by)));

  const button = (by: number, label: string, Icon: typeof Plus) => {
    const disabled = by < 0 ? tempo <= MIN_TEMPO : tempo >= MAX_TEMPO;
    return (
      <Pressable
        onPress={() => change(by)}
        disabled={disabled}
        accessibilityLabel={label}
        className={`h-11 w-11 items-center justify-center rounded-pill border border-border active:opacity-60 ${disabled ? "opacity-30" : ""}`}
      >
        <Icon color={colours.textSecondary} size={18} strokeWidth={1.5} />
      </Pressable>
    );
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Tempo"
      accessibilityValue={{ text: `${tempo} beats per minute` }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) =>
        change(e.nativeEvent.actionName === "increment" ? STEP : -STEP)
      }
      className="flex-row items-center gap-3"
    >
      {button(-STEP, "Slower", Minus)}
      <Text className="w-20 text-center font-mono text-body text-primary">
        {tempo} bpm
      </Text>
      {button(STEP, "Faster", Plus)}
    </View>
  );
}
