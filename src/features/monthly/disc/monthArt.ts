import { Skia, type SkImage } from "@shopify/react-native-skia";
import type { DayNote, Week } from "@/engine";
import { skiaPainter } from "@/features/weekly/disc/skiaPainter";
import { drawMonthDisc } from "./moonPhases";

/** The month's record, painted once to an image so spinning it costs nothing. */
export function makeMonthArt(
  days: readonly (DayNote | null)[],
  weeks: readonly Week[],
  size: number,
  seed: string,
): SkImage | null {
  const surface = Skia.Surface.Make(size, size);
  if (!surface) return null;
  drawMonthDisc(skiaPainter(surface.getCanvas()), size, days, weeks, seed);
  surface.flush();
  return surface.makeImageSnapshot();
}
