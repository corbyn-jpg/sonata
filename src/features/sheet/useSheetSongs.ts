import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getCheckins } from "@/lib/checkins";
import { addDays } from "@/lib/dates";
import { songChoices, type MonthSong, type WeekSong } from "./songs";

/**
 Every song the check-ins make, read from the phone (offline-first) each time the screen opens, so a
 new check-in shows up. Null until loaded.
 */
export function useSheetSongs() {
  const [songs, setSongs] = useState<{ weeks: WeekSong[]; months: MonthSong[] } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getCheckins(new Date(0), addDays(new Date(), 1))
        .then((checkins) => {
          if (cancelled) return;
          setSongs(songChoices(checkins.map(({ note, mode, instrument, timestamp }) => ({ note, mode, instrument, timestamp }))));
        })
        .catch((error) => {
          if (cancelled) return;
          console.warn("Couldn't load the songs for sheet music:", error);
          setSongs({ weeks: [], months: [] });
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return songs;
}
