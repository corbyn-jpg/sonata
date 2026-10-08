import { Pressable, Text, View } from "react-native";
import { INSTRUMENT_LABELS, INSTRUMENTS, type Instrument } from "@/audio";

type Props = {
  instrument: Instrument;
  onChange: (instrument: Instrument) => void;
};

/** Which instrument plays the melody. */
export function InstrumentPills({ instrument, onChange }: Props) {
  return (
    <View
      className="flex-row flex-wrap justify-center gap-2"
      accessibilityRole="radiogroup"
    >
      {INSTRUMENTS.map((option) => {
        const active = option === instrument;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            className={`h-11 justify-center rounded-pill border px-4 ${active ? "border-violet-500 bg-violet-700" : "border-border bg-surface/60"}`}
          >
            <Text
              className={`font-sans-medium text-caption ${active ? "text-primary" : "text-secondary"}`}
            >
              {INSTRUMENT_LABELS[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
