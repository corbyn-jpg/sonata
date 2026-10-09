import { getCheckins } from "@/lib/checkins";
import { addDays, dayKey } from "@/lib/dates";
import { shareAsPdf } from "@/lib/pdf";
import { getPlaylists } from "@/lib/playlists";
import { getThoughtRecords } from "@/lib/thoughtRecords";
import { dataReport } from "./dataReport";

/**
 Decrypt everything on this phone, lay it out as a readable PDF and open the share sheet with it. The decrypted data only ever goes into the PDF: it's never logged or uploaded.
 */
export async function exportMyData() {
  const now = new Date();
  const [checkins, thoughts, playlists] = await Promise.all([
    getCheckins(new Date(0), addDays(now, 1)),
    getThoughtRecords(),
    getPlaylists(),
  ]);
  const html = dataReport({
    checkins: checkins.map(
      ({ note, mode, instrument, reflection, timestamp }) => ({
        note,
        mode,
        instrument,
        reflection,
        timestamp,
      }),
    ),
    thoughts,
    playlists,
    madeAt: now,
  });
  await shareAsPdf(html, `Sonata - my data ${dayKey(now)}`, "Share your data");
}
