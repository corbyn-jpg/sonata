
import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { Settings } from "lucide-react-native";
import colours from "@/theme/colours";
import { focusRing, IconButton, PopupTip } from "./Tooltip";

function Row({
  state,
  note,
  children,
}: {
  state: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <View className="min-h-[64px] flex-row items-center gap-4 border-b border-border py-3">
      <Text className="w-20 font-mono text-caption text-secondary">
        {state}
      </Text>
      <View className="w-12 items-center">{children}</View>
      <Text className="flex-1 font-sans text-caption text-muted">{note}</Text>
    </View>
  );
}

const gear = (
  <Settings color={colours.textSecondary} size={24} strokeWidth={1.5} />
);
const base = "h-11 w-11 items-center justify-center rounded-pill";

/** Every state of an icon button with a tip, and of the "i" popup tip, stacked. */
export function TooltipPreview() {
  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="px-6 py-12"
    >
      <Text className="mb-4 font-mono-medium text-h4 text-primary">
        Tooltip · 8 states
      </Text>
      <Row state="default" note="Long-press, hover or focus to show the label.">
        <IconButton label="Settings" className={base}>
          {gear}
        </IconButton>
      </Row>
      <Row state="hover" note="Pointer only: the label shows after 600 ms.">
        <IconButton label="Settings" className={`${base} bg-surface`}>
          {gear}
        </IconButton>
      </Row>
      <Row
        state="focus"
        note="Keyboard focus: ring and label at once, no fade on the ring."
      >
        <View className={base} style={focusRing(true)}>
          {gear}
        </View>
      </Row>
      <Row
        state="active"
        note="Pressed: fades to 60%. A long-press shows the label for 1.5 s after release."
      >
        <View className={`${base} opacity-60`}>{gear}</View>
      </Row>
      <Row state="disabled" note="Dimmed; no tip.">
        <IconButton
          label="Next month"
          disabled
          className={`${base} opacity-30`}
        >
          {gear}
        </IconButton>
      </Row>
      <Row
        state="loading"
        note="n/a: a tip never does work. A busy button keeps its label."
      >
        <View className={base} />
      </Row>
      <Row
        state="error"
        note="n/a: errors stay on screen as text, never in a tip."
      >
        <View className={base} />
      </Row>
      <Row state="success" note="n/a: success is silent in Sonata.">
        <View className={base} />
      </Row>
      <Text className="mb-4 mt-10 font-mono-medium text-h4 text-primary">
        Popup tip
      </Text>
      <Row
        state="default"
        note="Tap to open; it stays until tapped away (or Back)."
      >
        <PopupTip
          label="About modes"
          text="A mode is the set of notes a song is built on."
        />
      </Row>
      <Row state="disabled" note="Dimmed and not focusable.">
        <PopupTip label="About modes" text="" disabled />
      </Row>
    </ScrollView>
  );
}
