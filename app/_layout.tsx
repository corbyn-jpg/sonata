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

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMMono_400Regular,
    DMMono_500Medium,
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // Sign in early so the first check-in doesn't wait on it. Failures retry on save.
  useEffect(() => {
    getUserId().catch(() => {});
  }, []);

  // Set how the app's sound behaves once, at launch, before anything plays
  useEffect(() => {
    ensureAudioMode();
  }, []);

  if (!loaded && !error) return null;

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
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="composer" />
        <Stack.Screen name="breathing" />
        <Stack.Screen name="thought-record/index" />
        <Stack.Screen name="thought-record/new" />
        <Stack.Screen name="calming-sounds" />
        <Stack.Screen name="sheet-music" />
        <Stack.Screen name="helplines" />
      </Stack>
    </GestureHandlerRootView>
  );
}
