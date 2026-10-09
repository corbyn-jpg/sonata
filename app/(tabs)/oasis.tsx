import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { BentoCard } from "@/components/BentoCard";
import { GlowOrb } from "@/components/GlowOrb";
import { Screen } from "@/components/Screen";
import { Sky } from "@/components/Sky";
import { TabHeader } from "@/components/TabHeader";
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

/** A card in the bento: words at the bottom, so every card in the grid reads from the same line. */
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
          <Text className="font-mono-medium text-body text-primary">
            {title}
          </Text>
          <Text className="font-sans text-caption text-secondary">{blurb}</Text>
        </View>
      </BentoCard>
    </Pressable>
  );
}

// A short tune on the composer's grid (row 0 is the highest note, C is row 6): E D C D E E E, then a rest
const TUNE = [4, 5, 6, 5, 4, 4, 4, -1];

/** The composer's own grid in miniature, the way the breathing card shows its orb. */
function ComposerPreview() {
  return (
    <View className="flex-1 justify-center gap-2">
      {Array.from({ length: 7 }, (_, row) => (
        <View key={row} className="flex-row justify-between">
          {TUNE.map((note, column) => (
            <View
              key={column}
              className={`h-1.5 w-1.5 rounded-pill ${note === row ? "bg-violet-200" : "bg-border"}`}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 Grounding Oasis: small, opt-in rituals first, support straight after (never below the fold), then the music you've
 made. A bento where size follows content: breathing and the composer are the big cards and show their own faces.
 */
export default function Oasis() {
  return (
    <Screen
      header={
        <TabHeader title="Grounding Oasis">
          <Text className="font-sans text-body text-secondary">
            Small rituals, and the music you&apos;ve made.
          </Text>
        </TabHeader>
      }
      background={<Sky pace={1.6} />}
    >
      <ScrollView
        contentContainerClassName="gap-3 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row gap-3">
          <Tool
            href="/breathing"
            title="Breathing space"
            blurb="A breathing exercise"
            className="min-h-[240px] flex-[3]"
          >
            {/* The same orb the exercise uses, resting */}
            <View className="flex-1 items-center justify-center">
              <GlowOrb
                size={72}
                core={colours.teal[300]}
                edge={colours.violet[500]}
                shimmer={false}
              />
            </View>
          </Tool>
          <View className="flex-[2] gap-3">
            <Tool
              href="/thought-record"
              title="Thought record"
              blurb="Write down your thoughts"
              className="flex-1"
            />
            <Tool
              href="/calming-sounds"
              title="Calming sounds"
              blurb="Sounds to help calm you down"
              className="flex-1"
            />
          </View>
        </View>

        <Tool
          href="/helplines"
          title="Support & helplines"
          blurb="Talk to someone when needed"
          className="min-h-[88px]"
        />

        <Text
          className="mt-5 font-mono-medium text-h4 text-primary"
          accessibilityRole="header"
        >
          Your music
        </Text>
        {/* Mirrors the first row (2/5 then 3/5), so the two rows interlock instead of lining up */}
        <View className="flex-row gap-3">
          <View className="flex-[2] gap-3">
            <Tool
              href="/playlists"
              title="Playlists"
              blurb="Your saved songs"
              className="flex-1"
            />
            <Tool
              href="/sheet-music"
              title="Sheet music"
              blurb="Your songs as a score"
              className="flex-1"
            />
          </View>
          <Tool
            href="/composer"
            title="Composer"
            blurb="Write a tune of your own"
            className="min-h-[240px] flex-[3]"
          >
            <ComposerPreview />
          </Tool>
        </View>
      </ScrollView>
    </Screen>
  );
}
