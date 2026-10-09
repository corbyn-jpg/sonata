// "Export my data": a readable, printable copy of everything the user has logged. Pure, so it's tested; exportMyData.ts gathers the data and prints it. Like the rest of Sonata it never shows emotion words: a check-in is its date, its note, Major or Minor, the instrument and the reflection.
import { INSTRUMENT_LABELS, type Instrument } from "@/audio/instruments";
import { displayName, type Letter, type Mode } from "@/data/notes";
import { patternOf, type ThoughtRecord } from "@/features/oasis/thoughts";
import { fromDayKey } from "@/lib/dates";
import type { PieceContent } from "@/lib/pieces";
import type { PlaylistSong } from "@/lib/playlistSongs";

export type ReportCheckin = {
  note: Letter;
  mode: Mode;
  instrument?: Instrument;
  reflection?: string;
  timestamp: Date;
};
export type ReportThought = ThoughtRecord & { updatedAt: number };
export type ReportPlaylist = { name: string; songs: PlaylistSong[] };
export type ReportPiece = PieceContent & { updatedAt: number };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const escape = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** e.g. "Tue 6 Oct 2026". */
const fullDate = (d: Date) =>
  `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const none = (what: string) => `<p class="none">No ${what} yet.</p>`;

function checkinTable(checkins: readonly ReportCheckin[]) {
  if (checkins.length === 0) return none("check-ins");
  const rows = [...checkins]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .map(
      (c) =>
        `<tr><td class="date">${fullDate(c.timestamp)}</td><td class="note">${displayName(c.note, c.mode)}</td>` +
        `<td>${c.mode === "major" ? "Major" : "Minor"}</td><td>${c.instrument ? INSTRUMENT_LABELS[c.instrument] : ""}</td>` +
        `<td>${c.reflection ? escape(c.reflection) : ""}</td></tr>`,
    )
    .join("");
  return `<table><thead><tr><th>Day</th><th>Note</th><th>Major or minor</th><th>Instrument</th><th>Reflection</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function thoughtList(thoughts: readonly ReportThought[]) {
  if (thoughts.length === 0) return none("thought records");
  return [...thoughts]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((t) => {
      const fields = [
        ["What happened", t.situation],
        ["What went through my mind", t.thought],
        ["Pattern", patternOf(t.pattern)?.name ?? ""],
        ["A kinder, more balanced thought", t.balanced],
      ]
        .filter(([, value]) => value)
        .map(([label, value]) => `<dt>${label}</dt><dd>${escape(value)}</dd>`)
        .join("");
      return `<section class="record"><h3>${fullDate(new Date(t.updatedAt))}</h3><dl>${fields}</dl></section>`;
    })
    .join("");
}

function playlistList(playlists: readonly ReportPlaylist[]) {
  if (playlists.length === 0) return none("playlists");
  return playlists
    .map((p) => {
      const songs = p.songs
        .map(
          (s) =>
            `<li>${s.kind === "week" ? `Week of ${fullDate(fromDayKey(s.week)).slice(4)}` : `${escape(s.name)} (your piece)`} · ${INSTRUMENT_LABELS[s.instrument]}</li>`,
        )
        .join("");
      return `<section class="record"><h3>${escape(p.name)}</h3>${songs ? `<ul>${songs}</ul>` : none("songs")}</section>`;
    })
    .join("");
}

/** A piece's notes, a bar at a time: "C E G – | …" (a dash is a rest). */
function tune({ mode, steps }: ReportPiece["piece"]) {
  const bars: string[] = [];
  for (let start = 0; start < steps.length; start += 4)
    bars.push(
      steps
        .slice(start, start + 4)
        .map((note) => (note ? displayName(note, mode) : "–"))
        .join(" "),
    );
  return bars.join(" | ");
}

function pieceList(pieces: readonly ReportPiece[]) {
  if (pieces.length === 0) return none("pieces");
  return [...pieces]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(({ name, instrument, piece, updatedAt }) => {
      const about = [
        fullDate(new Date(updatedAt)),
        piece.mode === "major" ? "Major" : "Minor",
        `${piece.tempo} bpm`,
        INSTRUMENT_LABELS[instrument],
        piece.harmony ? "with harmony" : "melody only",
      ].join(" · ");
      return `<section class="record"><h3>${escape(name)}</h3><p>${about}</p><p class="note">${tune(piece)}</p></section>`;
    })
    .join("");
}

export function dataReport(data: {
  checkins: readonly ReportCheckin[];
  thoughts: readonly ReportThought[];
  playlists: readonly ReportPlaylist[];
  pieces: readonly ReportPiece[];
  madeAt: Date;
}): string {
  const counts = [
    plural(data.checkins.length, "check-in"),
    plural(data.thoughts.length, "thought record"),
    plural(data.playlists.length, "playlist"),
    plural(data.pieces.length, "piece"),
  ].join(" · ");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 16mm; }
    body { margin: 0; font-family: Helvetica, Arial, sans-serif; font-size: 10pt; color: #111; }
    h1 { font-size: 20pt; font-weight: 600; margin: 0 0 4pt; }
    h2 { font-size: 13pt; font-weight: 600; margin: 22pt 0 8pt; border-bottom: 1px solid #ccc; padding-bottom: 4pt; }
    h3 { font-size: 10pt; font-weight: 600; margin: 0 0 4pt; }
    .lead { color: #555; margin: 0 0 4pt; }
    .warning { color: #555; margin: 0 0 8pt; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-weight: 600; color: #555; border-bottom: 1px solid #ccc; padding: 4pt 6pt 4pt 0; }
    td { vertical-align: top; border-bottom: 1px solid #eee; padding: 4pt 6pt 4pt 0; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .date { white-space: nowrap; }
    .note { font-weight: 600; }
    .record { break-inside: avoid; page-break-inside: avoid; margin-bottom: 12pt; }
    dt { color: #555; margin-top: 4pt; }
    dd { margin: 0; }
    ul { margin: 0; padding-left: 14pt; }
    .none { color: #888; }
  </style></head><body>
    <h1>Your Sonata data</h1>
    <p class="lead">Made on ${fullDate(data.madeAt)} · ${counts}</p>
    <p class="warning">This copy isn't encrypted, unlike the app. Keep it somewhere private.</p>
    <h2>Check-ins</h2>${checkinTable(data.checkins)}
    <h2>Thought records</h2>${thoughtList(data.thoughts)}
    <h2>Playlists</h2>${playlistList(data.playlists)}
    <h2>Composer pieces</h2>${pieceList(data.pieces)}
  </body></html>`;
}
