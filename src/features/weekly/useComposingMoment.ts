import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { playChime } from "@/audio";

const REVEALED_KEY = "sonata.weekly.revealed";
const MIN_SECONDS = 3.2; // long enough to feel like a moment, even when the song is already cached

/**
 Whether to show "Composing your week" now. It plays once for each new version of the week (so after every new check-in), with wind chimes while it lasts and a glockenspiel chime when the song is ready.
 */
export function useComposingMoment(weekKey: string | null, songReady: boolean) {
  const [revealing, setRevealing] = useState(false);
  const [waited, setWaited] = useState(false);
    const [replays, setReplays] = useState(0); // development builds: "Replay composing"
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start: a version of the week we haven't revealed yet
  useEffect(() => {
    if (!weekKey) return;
    let cancelled = false;
    AsyncStorage.getItem(REVEALED_KEY)
      .catch(() => null)
      .then((revealed) => {
        if (cancelled || revealed === weekKey) return;
        setRevealing(true);
        setWaited(false);
        timer.current = setTimeout(() => setWaited(true), MIN_SECONDS * 1000);
      });
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
    }, [weekKey, replays]);

  // Finish once the song is ready and the moment has had its time
  useEffect(() => {
    if (!revealing || !waited || !songReady || !weekKey) return;
    setRevealing(false);
    playChime("composed");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AsyncStorage.setItem(REVEALED_KEY, weekKey).catch(() => {});
  }, [revealing, waited, songReady, weekKey]);

    /** Development builds only: forget this week was shown, so the moment plays again. */
  const replay = async () => {
    await AsyncStorage.removeItem(REVEALED_KEY).catch(() => {});
    setReplays((n) => n + 1);
  };

  return { revealing, replay };
}