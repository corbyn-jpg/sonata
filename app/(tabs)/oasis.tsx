import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { BentoCard } from "@/components/BentoCard";
import { GlowOrb } from "@/components/GlowOrb";
import { Screen } from "@/components/Screen";
import { Sky } from "@/components/Sky";
import colours from "@/theme/colours";

type ToolProps = {
  href: Href;
  title: string;
  /** One line on what it's for. */
  blurb: string;
  className?: string;
  /** Shown above the words, e.g. the breathing orb. */
  children?: ReactNode;
};

/** A ritual in the bento: words at the bottom of the card, so every card in the grid reads from the same line. */
function Tool({ href, title, blurb, className = "", children }: ToolProps) {
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${blurb}`}
      className={`active:opacity-80 ${className}`}
    >
      <BentoCard className="flex-1 justify-end gap-3">
        {children}
        <View className="gap-1">
          <Text className="font-mono-medium text-body text-primary">{title}</Text>
          <Text className="font-sans text-caption text-secondary">{blurb}</Text>
        </View>
      </BentoCard>
    </Pressable>
  );
}

/**
 Grounding Oasis: small, opt-in rituals. A bento where size follows content: breathing is the main ritual and shows its own orb, the two smaller rituals sit beside it, and sheet music and support share the bottom row.
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
    <Screen header={header} background={<Sky pace={1.6} />}>
      <ScrollView contentContainerClassName="gap-3 pb-10" showsVerticalScrollIndicator={false}>
        <View className="flex-row gap-3">
          <Tool href="/breathing" title="Breathing space" blurb="A breathing exercise" className="min-h-[240px] flex-[3]">
            {/* The same orb the exercise uses, resting */}
            <View className="flex-1 items-center justify-center">
              <GlowOrb size={72} core={colours.teal[300]} edge={colours.violet[500]} shimmer={false} />
            </View>
          </Tool>
          <View className="flex-[2] gap-3">
            <Tool href="/thought-record" title="Thought record" blurb="Write down your thoughts" className="flex-1" />
            <Tool href="/calming-sounds" title="Calming sounds" blurb="Sounds to help calm you down" className="flex-1" />
          </View>
        </View>

        {/* The bottom row mirrors the top one (2/5 then 3/5), so the two rows interlock instead of lining up */}
        <View className="flex-row gap-3">
          <Tool href="/sheet-music" title="Sheet music" blurb="Your songs as a score" className="min-h-[120px] flex-[2]" />
          <Tool href="/helplines" title="Support & helplines" blurb="Talk to someone when needed" className="min-h-[120px] flex-[3]" />
        </View>
      </ScrollView>
    </Screen>
  );
}
