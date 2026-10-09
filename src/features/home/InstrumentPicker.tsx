import { useState } from "react";
import { Pressable, Text } from "react-native";
import {
  AudioWaveform,
  Check,
  ChevronDown,
  Feather,
  Piano,
  Wind,
  type LucideIcon,
} from "lucide-react-native";
import { INSTRUMENTS, INSTRUMENT_LABELS, type Instrument } from "@/audio";
import { BottomSheet } from "@/components/BottomSheet";
import colours from "@/theme/colours";

// Lucide has no violin or harp, so these suggest the sound instead
const ICONS: Record<Instrument, LucideIcon> = {
  piano: Piano,
  violin: AudioWaveform, // a long bowed note
  harp: Feather, // light, plucked
  flute: Wind,
};

type Props = {
  instrument: Instrument;
  onChange: (instrument: Instrument) => void;
};

/** Pill showing the current instrument; opens a small sheet to choose another. */
export function InstrumentPicker({ instrument, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const Icon = ICONS[instrument];

  const choose = (next: Instrument) => {
    setOpen(false);
    if (next !== instrument) onChange(next);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`Instrument: ${INSTRUMENT_LABELS[instrument]}`}
        accessibilityHint="Choose what your check-in sounds like"
        className="h-11 flex-row items-center gap-2 rounded-pill border border-border bg-surface/60 px-4"
      >
        <Icon color={colours.textSecondary} size={16} strokeWidth={1.5} />
        <Text className="font-sans-medium text-caption text-secondary">
          {INSTRUMENT_LABELS[instrument]}
        </Text>
        <ChevronDown color={colours.textMuted} size={14} strokeWidth={1.5} />
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        accessibilityRole="radiogroup"
        className="gap-1 px-5 pt-5"
      >
        <Text className="mb-2 px-2 font-mono-medium text-h4 text-primary">
          Your check-in sounds like
        </Text>
        {INSTRUMENTS.map((option) => {
          const OptionIcon = ICONS[option];
          const active = option === instrument;
          return (
            <Pressable
              key={option}
              onPress={() => choose(option)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={INSTRUMENT_LABELS[option]}
              className={`min-h-[55px] flex-row items-center gap-3 rounded-card px-3 ${active ? "bg-violet-700/40" : ""}`}
            >
              <OptionIcon
                color={active ? colours.violet[200] : colours.textSecondary}
                size={20}
                strokeWidth={1.5}
              />
              <Text className="flex-1 font-sans text-body text-primary">
                {INSTRUMENT_LABELS[option]}
              </Text>
              {active && (
                <Check
                  color={colours.violet[200]}
                  size={20}
                  strokeWidth={1.5}
                />
              )}
            </Pressable>
          );
        })}
      </BottomSheet>
    </>
  );
}
