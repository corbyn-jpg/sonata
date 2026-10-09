import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  DMMono_400Regular,
  DMMono_500Medium,
} from "@expo-google-fonts/dm-mono";
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from "@expo-google-fonts/roboto";
import colours from "@/theme/colours";
import { getUserId } from "@/lib/session";
import { ensureAudioMode } from "@/audio";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { setUpReminders } from "@/lib/reminder";
import { usePreference, usePreferencesReady } from "@/lib/preferences";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMMono_400Regular,
    DMMono_500Medium,
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  // The splash stays up until the fonts and the saved preferences are in, so a returning user never sees the intro flash past
  const ready = usePreferencesReady();
  const onboarded = usePreference("onboarded");
  const fontsDone = loaded || !!error;

  useEffect(() => {
    if (fontsDone && ready) SplashScreen.hideAsync();
  }, [fontsDone, ready]);

  // Sign in early so the first check-in doesn't wait on it. Failures retry on save.
  useEffect(() => {
    getUserId().catch(() => {});
  }, []);

  // Set how the app's sound behaves once, at launch, before anything plays
  useEffect(() => {
    ensureAudioMode();
  }, []);

  // A reminder that arrives while Sonata is open is shown quietly too
  useEffect(() => {
    setUpReminders().catch(() => {});
  }, []);

  if (!fontsDone || !ready) return null;

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colours.canvas }}
    >
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colours.canvas },
        }}
      >
        {/* The intro first, once; finishing it sets "onboarded", which swaps these over and opens Home */}
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="composer" />
          <Stack.Screen name="breathing" />
          <Stack.Screen name="thought-record/index" />
          <Stack.Screen name="thought-record/new" />
          <Stack.Screen name="calming-sounds" />
          <Stack.Screen name="sheet-music" />
          <Stack.Screen name="helplines" />
          <Stack.Screen name="playlists/index" />
          <Stack.Screen name="playlists/[id]" />
        </Stack.Protected>
      </Stack>
    </GestureHandlerRootView>
  );
}
