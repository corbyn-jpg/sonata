import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Canvas } from "@shopify/react-native-skia";
import { ChevronRight, FileMusic, Headphones, LifeBuoy, PenLine, Wind, type LucideIcon } from "lucide-react-native";
import { BentoCard } from "@/components/BentoCard";
import { Screen } from "@/components/Screen";
import { Sky } from "@/components/Sky";
import colours from "@/theme/colours";

type ToolProps = {
  href: Href;
  title: string;
  /** One line on what it's for. */
  blurb: string;
  Icon: LucideIcon;
  glow: [string, string];
  className?: string;
  /** Laid out in a row (icon, words, arrow) rather than stacked. */
  slim?: boolean;
  children?: ReactNode;
};

function Tool({ href, title, blurb, Icon, glow, className = "", slim = false, children }: ToolProps) {
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${blurb}`}
      className={className}
    >
      <BentoCard glow={glow} className={slim ? "flex-row items-center gap-3" : "flex-1 justify-between gap-6"}>
        {children}
        <View className="h-11 w-11 items-center justify-center rounded-card bg-canvas/40">
          <Icon color={colours.textPrimary} size={22} strokeWidth={1.5} />
        </View>
        <View className={slim ? "flex-1 gap-0.5" : "gap-1"}>
          <Text className="font-mono-medium text-h4 text-primary">{title}</Text>
          <Text className="font-sans text-caption text-secondary">{blurb}</Text>
        </View>
        {slim && <ChevronRight color={colours.textMuted} size={20} strokeWidth={1.5} />}
      </BentoCard>
    </Pressable>
  );
}

/**
 Grounding Oasis: small, opt-in rituals. A bento rather than a uniform grid, so the main one (breathing) carries the most weight, and help is always one tap away without being pushed.
 */
export default function Oasis() {
  const header = (
    <View className="mb-6 gap-1">
      <Text className="font-mono-medium text-h2 text-primary" accessibilityRole="header">
        Grounding Oasis
      </Text>
      <Text className="font-sans text-body text-secondary">Small rituals for when you need them.</Text>
    </View>
  );

  return (
    <Screen header={header}
    background={<Sky pace={1.4} />}>
      <ScrollView contentContainerClassName="gap-4" showsVerticalScrollIndicator={false}>
        <Tool
          href="/breathing"
          title="Breathing space"
          blurb="Breathing exercise · 1 min"
          Icon={Wind}
          glow={[colours.teal[300], colours.violet[500]]}
          className="h-44"
        >
        </Tool>

        <View className="flex-row gap-3">
          <Tool
            href="/thought-record"
            title="Thought record"
            blurb="Untangle a thought"
            Icon={PenLine}
            glow={[colours.violet[200], colours.violet[700]]}
            className="h-48 flex-1"
          />
          <Tool
            href="/calming-sounds"
            title="Calming sounds"
            blurb="Rain, drones, chimes"
            Icon={Headphones}
            glow={[colours.teal[300], colours.teal[700]]}
            className="h-48 flex-1"
          />
        </View>

        <Tool
          href="/sheet-music"
          title="Sheet music"
          blurb="Turn any of your songs into a score"
          Icon={FileMusic}
          glow={[colours.violet[500], colours.teal[300]]}
          slim
        />

        <Tool
          href="/helplines"
          title="Support & helplines"
          blurb="Talk to someone now"
          Icon={LifeBuoy}
          glow={[colours.violet[200], colours.teal[700]]}
          slim
        />
      </ScrollView>
    </Screen>
  );
}