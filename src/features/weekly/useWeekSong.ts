import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { Instrument } from "@/audio/instruments";
import { renderSong } from "@/audio/song";
import { composeWeek, type DayNote } from "@/engine";
import { hashString } from "@/engine/random";
import { getCheckins } from "@/lib/checkins";
import { addDays, dayKey, startOfWeek } from "@/lib/dates";
import { DEMO_WEEKS, type DemoWeek } from "./demoWeeks";

export type WeekDay = (DayNote & { instrument?: Instrument }) | null;

/** This week's check-ins (Monday first). Reloads whenever the tab is opened, to pick up today's. */
function useThisWeek() {
  const [weekStart] = useState(() => startOfWeek(new Date()));
  const [days, setDays] = useState<WeekDay[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const keys = Array.from({ length: 7 }, (_, i) => dayKey(addDays(weekStart, i)));
      getCheckins(weekStart, addDays(weekStart, 7))
        .then((checkins) => {
          if (cancelled) return;
          const next: WeekDay[] = Array(7).fill(null);
          // Oldest first, so if a day has two check-ins the later one wins
          for (const { note, mode, instrument, timestamp } of checkins) {
            const i = keys.indexOf(dayKey(timestamp));
            if (i >= 0) next[i] = { note, mode, instrument };
          }
          setDays(next);
          setLoadFailed(false);
        })
        .catch((error) => {
          if (cancelled) return;
          console.warn("Couldn't load this week's check-ins:", error);
          setDays(Array(7).fill(null));
          setLoadFailed(true);
        });
      return () => {
        cancelled = true;
      };
    }, [weekStart]),
  );

  return { weekStart, days, loadFailed };
}

/** The instrument used most this week (the latest wins a tie), so the song sounds like the days did. */
function weekInstrument(days: readonly WeekDay[] | null): Instrument | null {
  const counts = new Map<Instrument, number>();
  for (const day of days ?? []) if (day?.instrument) counts.set(day.instrument, (counts.get(day.instrument) ?? 0) + 1);
  let best: Instrument | null = null;
  for (const [instrument, count] of counts) if (!best || count >= counts.get(best)!) best = instrument;
  return best;
}

/**
 This week's song: composed by the engine from the check-ins so far, then rendered to a file.
 `status` is "composing" while the audio is being made (about a second on a phone).
 Pass `demo` (development builds only) to hear and see an example week instead.
 */
export function useWeekSong(demo: DemoWeek | null = null) {
  const real = useThisWeek();
  const weekStart = real.weekStart;
  const days = demo ? DEMO_WEEKS[demo] : real.days;
  const loadFailed = !demo && real.loadFailed;
  const [chosen, setInstrument] = useState<Instrument | null>(null);
  const instrument = chosen ?? weekInstrument(days) ?? "piano";

  // Only the notes matter to the song, so the song (and its file) are keyed by them
  const notes = days?.map((d) => d && { note: d.note, mode: d.mode }) ?? null;
  const weekKey = notes ? `${demo ?? dayKey(weekStart)}-${hashString(JSON.stringify(notes)).toString(36)}` : null;
  const song = useMemo(
    () => (notes?.some(Boolean) ? composeWeek(notes, dayKey(weekStart)) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- weekKey changes exactly when notes do
    [weekKey],
  );

  const [rendered, setRendered] = useState<{ key: string; uri: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const fileKey = `${weekKey}-${instrument}`;

  useEffect(() => {
    if (!song) return;
    let cancelled = false;
    setFailed(false);
    // Mixing blocks JavaScript for about a second, so let the "composing" state draw first
    const timer = setTimeout(() => {
      renderSong(song, instrument, `song-${weekKey}`)
        .then((file) => !cancelled && setRendered({ key: fileKey, uri: file.uri }))
        .catch((error) => {
          if (cancelled) return;
          console.warn("Couldn't render the week's song:", error);
          setFailed(true);
        });
    }, 50);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [song, instrument, weekKey, fileKey]);

  const status =
    days === null ? "loading"
    : loadFailed ? "offline"
    : !song ? "empty"
    : failed ? "error"
    : rendered?.key === fileKey ? "ready"
    : "composing";

  return {
    status,
    weekStart,
    weekKey,
    days,
    song,
    instrument,
    setInstrument,
    uri: status === "ready" ? rendered!.uri : null,
  } as const;
}