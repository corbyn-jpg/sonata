import { useCallback, useEffect, useMemo, useState } from "react";
import type { Letter, Mode } from "@/data/notes";
import { getCheckinDates, getCheckins } from "@/lib/checkins";
import { addDays, dayKey, startOfWeek, streakLength } from "@/lib/dates";

export type DayEntry = { note: Letter; mode: Mode } | null;

const STREAK_LOOKBACK_DAYS = 366;
const EMPTY_WEEK: DayEntry[] = Array(7).fill(null);

/** This week's check-ins (Monday first) and the current streak. */
export function useWeek() {
  const [weekStart] = useState(() => startOfWeek(new Date()));
  const [days, setDays] = useState<DayEntry[]>(EMPTY_WEEK);
  const [dates, setDates] = useState<Date[]>([]);
  const [loaded, setLoaded] = useState(false);

  const keys = useMemo(
    () => EMPTY_WEEK.map((_, i) => dayKey(addDays(weekStart, i))),
    [weekStart],
  );
  const todayIndex = keys.indexOf(dayKey(new Date()));

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [week, history] = await Promise.all([
          getCheckins(weekStart, addDays(weekStart, 7)),
          getCheckinDates(addDays(new Date(), -STREAK_LOOKBACK_DAYS)),
        ]);
        if (cancelled) return;

        const next = [...EMPTY_WEEK];
        // Oldest first, so if a day has two check-ins the later one wins
        for (const checkin of week) {
          const i = keys.indexOf(dayKey(checkin.timestamp));
          if (i >= 0) next[i] = { note: checkin.note, mode: checkin.mode };
        }
        setDays(next);
        setDates(history);
      } catch {
        // Offline or not signed in yet: show an empty week rather than an error
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [weekStart, keys]);

  const streak = useMemo(() => streakLength(dates), [dates]);

  /** Show a just-saved check-in straight away (the write may still be queued offline). Pass null to undo. */
  const logToday = useCallback(
    (entry: DayEntry) => {
      const today = dayKey(new Date());
      setDays((prev) => prev.map((d, i) => (i === todayIndex ? entry : d)));
      setDates((prev) =>
        entry ? [...prev, new Date()] : prev.filter((d) => dayKey(d) !== today),
      );
    },
    [todayIndex],
  );

  return {
    days,
    todayIndex,
    todayLogged: days[todayIndex] != null,
    streak,
    loaded,
    logToday,
  };
}
