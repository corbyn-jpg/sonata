import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { hasLowMoodRun, type DayNote, type Week } from "@/engine";
import { getCheckins } from "@/lib/checkins";
import { addDays, dayKey, startOfDay } from "@/lib/dates";

// Dismissing is remembered only until the app closes, and never stored or sent anywhere.
let dismissedThisSession = false;

/**
 Whether to gently offer a grounding moment: 4 or more Dark check-ins in a row within the last 7 calendar days (missed days skipped).
 */
export function useLowMoodOffer(example: Week | null) {
  const [heavy, setHeavy] = useState(false);
  const [dismissed, setDismissed] = useState(dismissedThisSession);

  useFocusEffect(
    useCallback(() => {
      if (example) {
        setHeavy(hasLowMoodRun(example));
        return;
      }
      let cancelled = false;
      const today = startOfDay(new Date());
      const keys = Array.from({ length: 7 }, (_, i) => dayKey(addDays(today, i - 6)));
      getCheckins(addDays(today, -6), addDays(today, 1))
        .then((checkins) => {
          const days: (DayNote | null)[] = Array(7).fill(null);
          for (const { note, mode, timestamp } of checkins) {
            const i = keys.indexOf(dayKey(timestamp));
            if (i >= 0) days[i] = { note, mode };
          }
          if (!cancelled) setHeavy(hasLowMoodRun(days));
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [example]),
  );

  const dismiss = () => {
    dismissedThisSession = true;
    setDismissed(true);
  };

  return { offer: heavy && !dismissed, dismiss };
}