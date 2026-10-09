import Share from "react-native-share";
import { shareAsPdf, shareFile } from "@/lib/pdf";
import { scoreToMusicXml } from "./musicxml";
import type { Score } from "./score";
import { scoreLines, type Look } from "./svg";

// Sheet music leaves the app the same way songs do: made on the phone, then the phone's share sheet (Save to Files, email, Drive…). Nothing is uploaded by Sonata.

// Black on white for paper; four bars to a line on A4
const PAPER: Look = {
  ink: "#111111",
  lines: "#444444",
  accent: "#111111",
  font: "Helvetica, Arial, sans-serif",
  gap: 7,
  width: 700,
  barsPerLine: 4,
};

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The printable page: a title, then the score one staff line at a time, so pages break between lines. */
function page(score: Score) {
  const lines = scoreLines(score, PAPER)
    .map(
      (line) =>
        `<div class="line">${line.svg.replace("<svg ", '<svg style="width:100%;height:auto" ')}</div>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 16mm; }
    body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #111; }
    h1 { font-size: 20pt; font-weight: 600; margin: 0 0 4pt; }
    p { margin: 0 0 16pt; font-size: 10pt; color: #555; }
    .line { break-inside: avoid; page-break-inside: avoid; margin-bottom: 4pt; }
    footer { margin-top: 16pt; font-size: 8pt; color: #888; }
  </style></head><body>
    <h1>${escape(score.title)}</h1><p>${escape(score.subtitle)}</p>${lines}
    <footer>Composed on this phone by Sonata.</footer>
  </body></html>`;
}

/** Make the score into an A4 PDF and open the share sheet with it. */
export const sharePdf = (score: Score, fileName: string) =>
  shareAsPdf(page(score), fileName, "Share your sheet music");

/** Write the score as MusicXML (opens in MuseScore, Sibelius, Dorico) and open the share sheet with it. */
export async function shareMusicXml(
  score: Score,
  instrument: string,
  fileName: string,
) {
  const file = shareFile(`${fileName}.musicxml`);
  file.create({ overwrite: true });
  file.write(scoreToMusicXml(score, instrument));
  await Share.open({
    url: file.uri,
    type: "application/vnd.recordare.musicxml+xml",
    title: "Share your sheet music",
    failOnCancel: false,
  });
}
