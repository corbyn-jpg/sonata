import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { interpolateColors } from "@shopify/react-native-skia";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Vibrate } from "lucide-react-native";
import { Sky } from "@/components/Sky";
import {
  ILLUSTRATION_HEIGHT,
  LockedOrb,
  OrbRow,
  RingedOrb,
  SAMPLE_COLOUR,
  SampleRecord,
} from "@/features/onboarding/Illustrations";
import { feelNote } from "@/haptics";
import { setPreference, usePreference } from "@/lib/preferences";
import colours from "@/theme/colours";

type Page = {
  title: string;
  body: string;
  Picture: (props: { width: number }) => ReactNode;
  /** The wash behind the page; it crossfades as you swipe. */
  glow: string;
  button: string;
};

// Words from wireframe 01 First launch
const PAGES: Page[] = [
  {
    title: "Sonata",
    body: "Your days, in music.\nOne orb a day. One song a week.",
    Picture: RingedOrb,
    glow: colours.violet[500],
    button: "Get started",
  },
  {
    title: "One orb a day",
    body: "Swipe until an orb sounds like today, then tap it. Each one plays its own chord as it lands. No words to pick, no scales to rate.",
    Picture: OrbRow,
    glow: colours.orb.E.major.edge,
    button: "Next",
  },
  {
    title: "Your week becomes a song",
    body: "Each week, Sonata composes a melody from your notes, right here on your phone. Play it, share it or keep it in a playlist.",
    Picture: SampleRecord,
    glow: SAMPLE_COLOUR,
    button: "Next",
  },
  {
    title: "Private by design",
    body: "Everything you log is encrypted on this phone before it is backed up. No account, no email, no trackers.",
    Picture: LockedOrb,
    glow: colours.teal[700],
    button: "Begin",
  },
];
const LAST = PAGES.length - 1;
const INDICES = PAGES.map((_, i) => i);
const GLOWS = PAGES.map((p) => p.glow);

/** Feel notes, offered here so someone who can't hear the app sets it up before their first check-in. */
function FeelNotesCard() {
  const feelNotes = usePreference("feelNotes");
  const onChange = (on: boolean) => {
    setPreference("feelNotes", on);
    if (on) feelNote("E", "major"); // a sample, so you know what to expect
  };
  return (
    <View className="mt-6 flex-row items-center gap-4 rounded-card border border-border bg-surface/60 p-4">
      <Vibrate color={colours.textSecondary} size={20} strokeWidth={1.5} />
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-medium text-body text-primary">
          Feel notes
        </Text>
        <Text className="font-sans text-caption text-secondary">
          Each note gets its own vibration. You can change this later in
          Settings.
        </Text>
      </View>
      <Switch
        value={feelNotes}
        onValueChange={onChange}
        accessibilityLabel="Feel notes"
        trackColor={{ false: colours.surfaceRaised, true: colours.violet[700] }}
        thumbColor={colours.textPrimary}
      />
    </View>
  );
}

/**
 First launch: a welcome and three short screens, then straight into the app. Swipe or tap Next; Skip goes straight
 in. No account and no email. Finishing it (or skipping) is remembered, and the app opens on Home.
 */
export default function Onboarding() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pager = useRef<Animated.ScrollView>(null);
  const [page, setPage] = useState(0);

  // Where the pager is, in pages (1.5 = halfway between the second and third), for the wash
  const position = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    position.value = event.contentOffset.x / width;
  });
  const glow = useDerivedValue(() => {
    const [r, g, b] = interpolateColors(position.value, INDICES, GLOWS);
    return [r, g, b, 0.85];
  });

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));

  const finish = () => setPreference("onboarded", true); // the layout then opens Home

  const goTo = (to: number) => {
    pager.current?.scrollTo({ x: to * width, animated: true });
    setPage(to);
  };
  const next = () => (page === LAST ? finish() : goTo(page + 1));

  // Android's back button steps back a page, rather than closing the app part-way through
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (page === 0) return false;
        pager.current?.scrollTo({ x: (page - 1) * width, animated: true });
        setPage(page - 1);
        return true;
      },
    );
    return () => subscription.remove();
  }, [page, width]);

  return (
    <View className="flex-1 bg-canvas">
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Sky glow={glow} pace={1.3} />
      </View>

      <Animated.ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={settle}
        style={{ flex: 1 }}
      >
        {PAGES.map(({ title, body, Picture }, i) => (
          <View
            key={title}
            style={{ width, paddingTop: insets.top + (height < 720 ? 16 : 48) }} // less on short phones, so the last page fits
            className="items-center px-6"
            // Only the page in view is read out
            importantForAccessibility={
              i === page ? "auto" : "no-hide-descendants"
            }
            accessibilityElementsHidden={i !== page}
          >
            <View
              style={{ height: ILLUSTRATION_HEIGHT }}
              importantForAccessibility="no-hide-descendants"
            >
              <Picture width={width} />
            </View>
            <Text
              accessibilityRole="header"
              className={`mt-8 text-center font-mono-medium text-primary ${i === 0 ? "text-h1" : "text-h2"}`}
            >
              {title}
            </Text>
            <Text className="mt-3 text-center font-sans text-body text-secondary">
              {body}
            </Text>
            {i === LAST && <FeelNotesCard />}
          </View>
        ))}
      </Animated.ScrollView>

      <View
        className="gap-4 px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        {/* Which page this is: the current one is a longer dash */}
        <View
          className="flex-row items-center justify-center gap-2"
          accessible
          accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}
        >
          {PAGES.map((p, i) => (
            <View
              key={p.title}
              className={`h-1.5 rounded-pill ${i === page ? "w-6 bg-violet-200" : "w-1.5 bg-border"}`}
            />
          ))}
        </View>
        <Pressable
          onPress={next}
          accessibilityRole="button"
          className="min-h-[52px] items-center justify-center rounded-pill bg-violet-700 active:opacity-80"
        >
          <Text className="font-sans-bold text-body text-primary">
            {PAGES[page].button}
          </Text>
        </Pressable>
        {/* Kept in place on the last page (just hidden), so the button doesn't jump */}
        <Pressable
          onPress={finish}
          disabled={page === LAST}
          accessibilityRole="button"
          accessibilityElementsHidden={page === LAST}
          importantForAccessibility={
            page === LAST ? "no-hide-descendants" : "auto"
          }
          className={`min-h-[44px] items-center justify-center ${page === LAST ? "opacity-0" : ""}`}
        >
          <Text className="font-sans-medium text-body text-secondary">
            Skip intro
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
