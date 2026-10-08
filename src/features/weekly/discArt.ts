import { Skia, type SkImage } from "@shopify/react-native-skia";
import type { Composition, DayNote } from "@/engine";
import { drawDisc } from "./disc/scenes";
import { skiaPainter } from "./disc/skiaPainter";

/**
 The record's face for this week's song, painted once to an image so spinning it costs nothing.
`seed` should identify the week (its Monday), so two weeks with the same notes still differ.
 */
export function makeDiscArt(
  days: readonly (DayNote | null)[],
  song: Composition,
  size: number,
  seed: string,
): SkImage | null {
  const surface = Skia.Surface.Make(size, size);
  if (!surface) return null;
  drawDisc(
    skiaPainter(surface.getCanvas()),
    size,
    days,
    song.palette,
    song.mode,
    seed,
  );
  surface.flush();
  return surface.makeImageSnapshot();
}
