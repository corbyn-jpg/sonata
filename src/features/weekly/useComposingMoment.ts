import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { playChime } from "@/audio";

const REVEALED_KEY = "sonata.weekly.revealed";
const MIN_SECONDS = 3.2; // long enough to feel like a moment, even when the song is already cached

/**
 Whether to show "Composing your week" now. It plays once for each new version of the week (so after every new check-in), with wind chimes while it lasts and a glockenspiel chime when the song is ready.
 */
export function useComposingMoment(weekKey: string | null, songReady: boolean) {
  // The version of the week being revealed, and whether it has had its minimum time on screen
  const [moment, setMoment] = useState<{ key: string; waited: boolean } | null>(null);

  // Start: a version of the week we haven't revealed yet
  useEffect(() => {
    if (!weekKey) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    AsyncStorage.getItem(REVEALED_KEY)
      .catch(() => null)
      .then((revealed) => {
        if (cancelled || revealed === weekKey) return;
        setMoment({ key: weekKey, waited: false });
        timer = setTimeout(
          () => setMoment((m) => (m?.key === weekKey ? { ...m, waited: true } : m)),
          MIN_SECONDS * 1000,
        );
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [weekKey]);

  // Worked out during render rather than stored: showing until the song is ready and the moment has had its time
  const current = moment !== null && moment.key === weekKey;
  const finished = current && moment.waited && songReady;
  const revealing = current && !finished;

  // Finish: chime, remember this version was shown, then clear the moment
  useEffect(() => {
    if (!finished || !weekKey) return;
    playChime("composed");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AsyncStorage.setItem(REVEALED_KEY, weekKey)
      .catch(() => {})
      .finally(() => setMoment(null));
  }, [finished, weekKey]);

  return { revealing };
}