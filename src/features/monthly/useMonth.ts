import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getCheckinDates, getCheckins } from "@/lib/checkins";
import { addDays, dayKey, fromDayKey, streakLength } from "@/lib/dates";
import { addMonths, summariseMonth, weeksOfMonth, type DatedNote } from "./month";

const STREAK_LOOKBACK_DAYS = 366;

/**
 One month's check-ins, summarised, plus the current streak. Read from the phone (offline-first), and again whenever the tab is opened, to pick up new check-ins.
 */
export function useMonth(month: Date) {
  const key = dayKey(month); // the 1st, e.g. "2026-10-01"
  // Tagged with the month it belongs to, so switching months shows "loading" without resetting state in an effect
  const [loaded, setLoaded] = useState<{ key: string; checkins: DatedNote[]; dates: Date[] } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const first = fromDayKey(key);
      // The last week that starts in this month runs into the next one, so read up to its Sunday
      const weeks = weeksOfMonth(first);
      const lastWeekEnd = weeks.length ? addDays(weeks[weeks.length - 1], 7) : first;
      const nextMonth = addMonths(first, 1);
      const to = lastWeekEnd > nextMonth ? lastWeekEnd : nextMonth;

      Promise.all([getCheckins(first, to), getCheckinDates(addDays(new Date(), -STREAK_LOOKBACK_DAYS))])
        .then(([checkins, dates]) => {
          if (cancelled) return;
          setLoaded({ key, checkins: checkins.map(({ note, mode, instrument, timestamp }) => ({ note, mode, instrument, timestamp })), dates });
        })
        .catch((error) => {
          if (cancelled) return;
          console.warn("Couldn't load the month's check-ins:", error);
          setLoaded({ key, checkins: [], dates: [] });
        });
      return () => {
        cancelled = true;
      };
    }, [key]),
  );

  const current = loaded?.key === key ? loaded : null;
  const summary = useMemo(() => (current ? summariseMonth(current.checkins, fromDayKey(key)) : null), [current, key]);
  const streak = useMemo(() => (current ? streakLength(current.dates) : 0), [current]);

  return { loading: current === null, summary, streak };
}