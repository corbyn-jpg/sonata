// A score drawn as SVG, one staff line (system) per <svg>: shown in the app with react-native-svg,
// and printed to PDF, where a page can break between lines but never through one. Hand-built shapes;
// the clef and flat are Material Design Icons (Apache 2.0), as on Home's staff.
import { chordName, engraveBar, staffStep, type Item } from "./notation";
import type { Score, ScoreBar } from "./score";

export type Look = {
  /** Notes, rests, clef and text. */
  ink: string;
  /** Staff lines and barlines. */
  lines: string;
  /** Chord names and the tempo marks above the staff. */
  accent: string;
  font: string;
  /** Space between staff lines; everything scales from it. */
  gap: number;
  width: number;
  barsPerLine: number;
};

export type ScoreLine = { svg: string; width: number; height: number };

const CLEF =
  "M13 11V7.5L15.2 5.29C16 4.5 16.15 3.24 15.59 2.26C15.14 1.47 14.32 1 13.45 1C13.24 1 13 1.03 12.81 1.09C11.73 1.38 11 2.38 11 3.5V6.74L7.86 9.91C6.2 11.6 5.7 14.13 6.61 16.34C7.38 18.24 9.06 19.55 11 19.89V20.5C11 20.76 10.77 21 10.5 21H9V23H10.5C11.85 23 13 21.89 13 20.5V20C15.03 20 17.16 18.08 17.16 15.25C17.16 12.95 15.24 11 13 11M13 3.5C13 3.27 13.11 3.09 13.32 3.03C13.54 2.97 13.77 3.06 13.88 3.26C14 3.46 13.96 3.71 13.8 3.87L13 4.73V3.5M11 11.5C10.03 12.14 9.3 13.24 9.04 14.26L11 14.78V17.83C9.87 17.53 8.9 16.71 8.43 15.57C7.84 14.11 8.16 12.45 9.26 11.33L11 9.5V11.5M13 18V12.94C14.17 12.94 15.18 14.04 15.18 15.25C15.18 17 13.91 18 13 18Z";
const FLAT =
  "M8.5 19C13.36 16.26 15.5 13.91 15.5 12C15.5 10.59 14.79 9 12.5 9C11.8 9 11.11 9.28 10.5 9.67V5H8.5M10.5 15.38V12.26C11.12 11.59 11.95 11 12.5 11C13.09 11 13.5 11.07 13.5 12C13.5 12.15 13.4 13.3 10.5 15.38Z";

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n = (v: number) => Math.round(v * 100) / 100;

type Placed = { bar: ScoreBar; first: boolean; label: string | null; tempo: number; last: boolean };

/** The score as SVG staff lines, `barsPerLine` bars to a line. */
export function scoreLines(score: Score, look: Look): ScoreLine[] {
  const placed: Placed[] = score.sections.flatMap((section, s) =>
    section.bars.map((bar, b) => ({
      bar,
      first: b === 0,
      label: section.label,
      tempo: section.tempo,
      last: s === score.sections.length - 1 && b === section.bars.length - 1,
    })),
  );
  const lines: ScoreLine[] = [];
  for (let i = 0; i < placed.length; i += look.barsPerLine)
    lines.push(drawLine(placed.slice(i, i + look.barsPerLine), i === 0, look));
  return lines;
}

function drawLine(bars: Placed[], firstLine: boolean, look: Look): ScoreLine {
  const { gap: g, ink, lines: lineColour, accent, font, width } = look;
  const staffTop = 5.6 * g;
  const staffBottom = staffTop + 4 * g;
  const height = staffBottom + 2.8 * g;
  const y = (step: number) => staffBottom - (step * g) / 2;
  const out: string[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number, w: number, colour = ink) =>
    out.push(`<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${colour}" stroke-width="${n(w)}" />`);
  const text = (x: number, yy: number, content: string, size: number, colour: string, weight = 400) =>
    out.push(`<text x="${n(x)}" y="${n(yy)}" font-family="${font}" font-size="${n(size)}" font-weight="${weight}" fill="${colour}">${escape(content)}</text>`);

  // Clef on every line; 4/4 on the first
  const clefScale = (7.4 * g) / 22;
  out.push(`<path d="${CLEF}" fill="${ink}" transform="translate(${n(0.2 * g - 6 * clefScale)} ${n(y(2) - 15.3 * clefScale)}) scale(${n(clefScale)})" />`);
  if (firstLine) {
    text(4.5 * g, y(6) + 0.75 * g, "4", 2.2 * g, ink, 700);
    text(4.5 * g, y(2) + 0.75 * g, "4", 2.2 * g, ink, 700);
  }
  const contentStart = firstLine ? 7 * g : 4.8 * g;
  const barWidth = (width - contentStart) / look.barsPerLine;
  const staffEnd = contentStart + barWidth * bars.length;
  for (let s = 0; s <= 8; s += 2) line(0, y(s), staffEnd, y(s), 0.1 * g, lineColour);

  bars.forEach((placed, j) => {
    const barX = contentStart + j * barWidth;
    const left = barX + 1.9 * g;
    const inner = barWidth - 2.8 * g;
    const xAt = (beat: number) => left + (beat / 4) * inner;

    // Above the staff: the section's name and tempo at its first bar, then the chord names
    if (placed.first) {
      const mark = `${placed.label ? `${placed.label}  ` : ""}♩ = ${placed.tempo}`;
      text(barX + (j === 0 ? 0 : 0.4 * g), 1.4 * g, mark, 1.3 * g, accent, 600);
    }
    for (const { chord, start } of placed.bar.chords) text(xAt(start), 3.7 * g, chordName(chord), 1.45 * g, accent, 600);

    const items = engraveBar(placed.bar.notes);
    items.forEach((item, k) => drawItem(item, items[k + 1], { barX, barWidth, xAt, y, g, ink, out, line }));

    // Barline (a final double bar at the very end)
    const end = barX + barWidth;
    if (placed.last) {
      line(end - 0.7 * g, y(8), end - 0.7 * g, y(0), 0.12 * g, lineColour);
      out.push(`<rect x="${n(end - 0.4 * g)}" y="${n(y(8))}" width="${n(0.4 * g)}" height="${n(4 * g)}" fill="${lineColour}" />`);
    } else line(end, y(8), end, y(0), 0.12 * g, lineColour);
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}" height="${n(height)}" viewBox="0 0 ${n(width)} ${n(height)}">${out.join("")}</svg>`;
  return { svg, width, height };
}

type Pen = {
  barX: number;
  barWidth: number;
  xAt: (beat: number) => number;
  y: (step: number) => number;
  g: number;
  ink: string;
  out: string[];
  line: (x1: number, y1: number, x2: number, y2: number, w: number, colour?: string) => void;
};

function drawItem(item: Item, next: Item | undefined, pen: Pen) {
  const { xAt, y, g, ink, out, line } = pen;
  const middle = y(4);

  if (item.kind === "rest") {
    const cx = item.wholeBar ? pen.barX + pen.barWidth / 2 : xAt(item.start) + 0.6 * g;
    if (item.type === "whole") out.push(`<rect x="${n(cx - 0.6 * g)}" y="${n(y(6))}" width="${n(1.2 * g)}" height="${n(0.5 * g)}" fill="${ink}" />`);
    else if (item.type === "half") out.push(`<rect x="${n(cx - 0.6 * g)}" y="${n(middle - 0.5 * g)}" width="${n(1.2 * g)}" height="${n(0.5 * g)}" fill="${ink}" />`);
    else if (item.type === "quarter") {
      const pts = [[-0.2, -1.5], [0.35, -0.7], [-0.2, -0.05], [0.3, 0.7], [-0.3, 0.55], [-0.05, 1.3]]
        .map(([dx, dy]) => `${n(cx + dx * g)},${n(middle + dy * g)}`)
        .join(" ");
      out.push(`<polyline points="${pts}" fill="none" stroke="${ink}" stroke-width="${n(0.22 * g)}" stroke-linejoin="round" stroke-linecap="round" />`);
    } else {
      // Eighth (and the rare 16th, which gets a second hook)
      const hooks = item.type === "16th" ? [0, 0.9] : [0];
      for (const dy of hooks) {
        out.push(`<circle cx="${n(cx - 0.25 * g)}" cy="${n(middle - (0.65 - dy) * g)}" r="${n(0.24 * g)}" fill="${ink}" />`);
        out.push(`<path d="M${n(cx - 0.25 * g)} ${n(middle - (0.45 - dy) * g)} Q${n(cx + 0.15 * g)} ${n(middle - (0.35 - dy) * g)} ${n(cx + 0.35 * g)} ${n(middle - (0.9 - dy) * g)}" fill="none" stroke="${ink}" stroke-width="${n(0.16 * g)}" />`);
      }
      line(cx + 0.35 * g, middle - 0.9 * g, cx - 0.15 * g, middle + 1.1 * g, 0.16 * g);
    }
    return;
  }

  const step = staffStep(item.pitch);
  const hy = y(step);
  const hx = item.type === "whole" && item.start === 0 && item.length === 4 ? pen.barX + pen.barWidth / 2 : xAt(item.start) + 0.65 * g;

  // Ledger lines above or below the staff
  for (let s = 10; s <= step; s += 2) line(hx - 1.05 * g, y(s), hx + 1.05 * g, y(s), 0.1 * g);
  for (let s = -2; s >= step; s -= 2) line(hx - 1.05 * g, y(s), hx + 1.05 * g, y(s), 0.1 * g);

  // Accidental, to the left of the head
  if (item.accidental) drawAccidental(item.accidental, hx - 1.55 * g, hy, pen);

  // Head: hollow for whole and half notes, filled for the rest
  if (item.type === "whole")
    out.push(`<ellipse cx="${n(hx)}" cy="${n(hy)}" rx="${n(0.72 * g)}" ry="${n(0.44 * g)}" fill="none" stroke="${ink}" stroke-width="${n(0.2 * g)}" />`);
  else {
    const hollow = item.type === "half";
    out.push(
      `<ellipse cx="${n(hx)}" cy="${n(hy)}" rx="${n(0.6 * g)}" ry="${n(0.4 * g)}" transform="rotate(-20 ${n(hx)} ${n(hy)})" ` +
        (hollow ? `fill="none" stroke="${ink}" stroke-width="${n(0.16 * g)}" />` : `fill="${ink}" />`),
    );
  }
  if (item.dotted) out.push(`<circle cx="${n(hx + 1 * g)}" cy="${n(step % 2 === 0 ? hy - g / 2 : hy)}" r="${n(0.17 * g)}" fill="${ink}" />`);

  // Stem (with a flag or a beam) for everything shorter than a whole note
  if (item.type !== "whole") {
    const partner = item.beam === "begin" && next?.kind === "note" ? next : null;
    const up = partner ? (step + staffStep(partner.pitch)) / 2 < 4 : step < 4;
    if (item.beam === "end") {
      // Drawn with its partner
    } else if (partner) {
      const px = xAt(partner.start) + 0.65 * g;
      const py = y(staffStep(partner.pitch));
      const sx = (x: number) => (up ? x + 0.56 * g : x - 0.56 * g);
      const beamY = up ? Math.min(hy, py) - 3.4 * g : Math.max(hy, py) + 3.4 * g;
      line(sx(hx), hy, sx(hx), beamY, 0.12 * g);
      line(sx(px), py, sx(px), beamY, 0.12 * g);
      const t = up ? 0.5 * g : -0.5 * g;
      out.push(`<polygon points="${n(sx(hx))},${n(beamY)} ${n(sx(px))},${n(beamY)} ${n(sx(px))},${n(beamY + t)} ${n(sx(hx))},${n(beamY + t)}" fill="${ink}" />`);
    } else {
      const sx = up ? hx + 0.56 * g : hx - 0.56 * g;
      const tip = up ? hy - 3.4 * g : hy + 3.4 * g;
      line(sx, hy, sx, tip, 0.12 * g);
      const flags = item.type === "eighth" ? 1 : item.type === "16th" ? 2 : 0;
      for (let f = 0; f < flags; f++) {
        const fy = up ? tip + f * 0.8 * g : tip - f * 0.8 * g;
        const d = up ? 1 : -1;
        out.push(`<path d="M${n(sx)} ${n(fy)} c${n(0.1 * g)} ${n(d * 1.1 * g)} ${n(1.3 * g)} ${n(d * 1.3 * g)} ${n(1 * g)} ${n(d * 2.8 * g)}" fill="none" stroke="${ink}" stroke-width="${n(0.2 * g)}" />`);
      }
    }

    // A tie arcs to the next note, on the side away from the stem
    if (item.tie && next) {
      const x2 = xAt(next.start) + 0.65 * g;
      const off = up ? 0.6 * g : -0.6 * g;
      out.push(`<path d="M${n(hx + 0.6 * g)} ${n(hy + off)} Q${n((hx + x2) / 2)} ${n(hy + off * 2.4)} ${n(x2 - 0.6 * g)} ${n(hy + off)}" fill="none" stroke="${ink}" stroke-width="${n(0.14 * g)}" />`);
    }
  }
}

function drawAccidental(kind: "flat" | "sharp" | "natural", ax: number, ay: number, pen: Pen) {
  const { g, ink, out, line } = pen;
  if (kind === "flat") {
    const s = (2.3 * g) / 14;
    out.push(`<path d="${FLAT}" fill="${ink}" transform="translate(${n(ax - 12 * s)} ${n(ay - 13.3 * s)}) scale(${n(s)})" />`);
    return;
  }
  const w = 0.12 * g;
  if (kind === "sharp") {
    line(ax - 0.22 * g, ay - 1.2 * g, ax - 0.22 * g, ay + 1.3 * g, w);
    line(ax + 0.22 * g, ay - 1.35 * g, ax + 0.22 * g, ay + 1.15 * g, w);
    line(ax - 0.5 * g, ay - 0.3 * g, ax + 0.5 * g, ay - 0.55 * g, 0.26 * g);
    line(ax - 0.5 * g, ay + 0.55 * g, ax + 0.5 * g, ay + 0.3 * g, 0.26 * g);
    return;
  }
  line(ax - 0.22 * g, ay - 1.3 * g, ax - 0.22 * g, ay + 0.5 * g, w);
  line(ax + 0.22 * g, ay - 0.5 * g, ax + 0.22 * g, ay + 1.3 * g, w);
  line(ax - 0.22 * g, ay - 0.25 * g, ax + 0.22 * g, ay - 0.45 * g, 0.26 * g);
  line(ax - 0.22 * g, ay + 0.45 * g, ax + 0.22 * g, ay + 0.25 * g, 0.26 * g);
}
