import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getCheckins } from "@/lib/checkins";
import { addDays } from "@/lib/dates";
import { getPieces } from "@/lib/pieces";
import {
  pieceChoices,
  songChoices,
  type MonthSong,
  type PieceChoice,
  type WeekSong,
} from "./songs";

type SheetSongs = {
  weeks: WeekSong[];
  months: MonthSong[];
  pieces: PieceChoice[];
};

/**
 Every song the check-ins make, and every saved Composer piece, read from the phone (offline-first) each time the
 screen opens, so a new check-in or piece shows up. Null until loaded.
 */
export function useSheetSongs() {
  const [songs, setSongs] = useState<SheetSongs | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        getCheckins(new Date(0), addDays(new Date(), 1)),
        getPieces(),
      ])
        .then(([checkins, pieces]) => {
          if (cancelled) return;
          setSongs({
            ...songChoices(
              checkins.map(({ note, mode, instrument, timestamp }) => ({
                note,
                mode,
                instrument,
                timestamp,
              })),
            ),
            pieces: pieceChoices(pieces),
          });
        })
        .catch((error) => {
          if (cancelled) return;
          console.warn("Couldn't load the songs for sheet music:", error);
          setSongs({ weeks: [], months: [], pieces: [] });
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return songs;
}
