import { composeWeek, type Chord, type Week } from "@/engine";
import { scoreToMusicXml } from "./musicxml";
import { chordName, engraveBar, spell, staffStep } from "./notation";
import { monthScore, weekScore } from "./score";
import { songChoices } from "./songs";
import { scoreLines } from "./svg";

const chord = (root: number, quality: Chord["quality"], seventh: number | null = null): Chord => ({
  root,
  quality,
  seventh,
  degree: 0,
  source: "ionian",
  borrowed: false,
});
const total = (items: { length: number }[]) => items.reduce((sum, i) => sum + i.length, 0);

const weekA: Week = [
  { note: "E", mode: "minor" }, { note: "C", mode: "major" }, null,
  { note: "A", mode: "minor" }, { note: "G", mode: "major" }, { note: "B", mode: "minor" }, { note: "D", mode: "minor" },
];
const weekB: Week = [
  { note: "E", mode: "major" }, { note: "A", mode: "major" }, { note: "F", mode: "major" },
  { note: "G", mode: "major" }, null, { note: "B", mode: "major" }, { note: "C", mode: "major" },
];

describe("notation", () => {
  it("spells notes in C, with flats for the minor modes and F♯ for Lydian", () => {
    expect(spell(63)).toEqual({ step: "E", alter: -1, octave: 4 });
    expect(spell(66)).toEqual({ step: "F", alter: 1, octave: 4 });
    expect(spell(72)).toEqual({ step: "C", alter: 0, octave: 5 });
  });

  it("places notes on the treble staff", () => {
    expect(staffStep(spell(64))).toBe(0); // E4, bottom line
    expect(staffStep(spell(71))).toBe(4); // B4, middle line
    expect(staffStep(spell(77))).toBe(8); // F5, top line
    expect(staffStep(spell(60))).toBe(-2); // C4, a ledger line below
  });

  it("names chords as on a lead sheet", () => {
    expect(chordName(chord(2, "minor"))).toBe("Dm");
    expect(chordName(chord(7, "major", 5))).toBe("G7");
    expect(chordName(chord(8, "major", 7))).toBe("A♭maj7");
    expect(chordName(chord(11, "diminished"))).toBe("Bdim");
  });

  it("fills an empty bar with one whole-bar rest", () => {
    expect(engraveBar([])).toEqual([expect.objectContaining({ kind: "rest", wholeBar: true, length: 4 })]);
  });

  it("writes the engine's rhythms with the right shapes", () => {
    const heavy = engraveBar([{ midi: 72, start: 0, duration: 3 }, { midi: 74, start: 3, duration: 1 }]);
    expect(heavy.map((i) => [i.type, i.dotted])).toEqual([["half", true], ["quarter", false]]);

    const bright = engraveBar([
      { midi: 72, start: 0, duration: 2 }, { midi: 74, start: 2, duration: 1 },
      { midi: 76, start: 3, duration: 0.5 }, { midi: 77, start: 3.5, duration: 0.5 },
    ]);
    expect(bright.map((i) => (i.kind === "note" ? i.beam : null))).toEqual([null, null, "begin", "end"]);
  });

  it("rests where the melody is silent", () => {
    const items = engraveBar([{ midi: 72, start: 0, duration: 2 }]);
    expect(items.map((i) => [i.kind, i.start, i.length])).toEqual([["note", 0, 2], ["rest", 2, 2]]);
  });

  it("prints each accidental once per bar, and a natural when the plain note returns", () => {
    const items = engraveBar([
      { midi: 75, start: 0, duration: 1 }, { midi: 75, start: 1, duration: 1 }, { midi: 76, start: 2, duration: 2 },
    ]);
    expect(items.map((i) => (i.kind === "note" ? i.accidental : null))).toEqual(["flat", null, "natural"]);
  });
});

describe("scores", () => {
  it("writes a week as seven full bars", () => {
    const score = weekScore(composeWeek(weekA, "2026-09-28"), "Week of 28 Sep 2026", "Piano");
    expect(score.sections[0].bars).toHaveLength(7);
    for (const bar of score.sections[0].bars) expect(total(engraveBar(bar.notes))).toBeCloseTo(4);
  });

  it("writes a month as its weeks at their own tempos, joined by link bars", () => {
    const inputs = [{ week: weekA, seed: "2026-09-28" }, { week: weekB, seed: "2026-10-05" }];
    const score = monthScore(inputs, "2026-10-01", ["Week of 28 Sep", "Week of 5 Oct"], "October 2026", "Piano");
    expect(score.sections.map((s) => [s.label, s.bars.length])).toEqual([
      ["Week of 28 Sep", 7],
      [null, 1],
      ["Week of 5 Oct", 7],
    ]);
    expect(score.sections[0].tempo).toBe(composeWeek(weekA, "2026-09-28").tempo);
    expect(score.sections[2].tempo).toBe(composeWeek(weekB, "2026-10-05").tempo);
    // The link bar's melody comes back to whole beats once un-stretched
    const link = engraveBar(score.sections[1].bars[0].notes);
    expect(total(link)).toBeCloseTo(4);
    expect(link.some((i) => i.kind === "note")).toBe(true);
  });

  it("draws one SVG per staff line", () => {
    const score = weekScore(composeWeek(weekA, "2026-09-28"), "Week", "Piano");
    const look = { ink: "#000", lines: "#000", accent: "#000", font: "serif", gap: 8, width: 340, barsPerLine: 2 };
    const lines = scoreLines(score, look);
    expect(lines).toHaveLength(4); // 7 bars, 2 to a line
    expect(lines.every((l) => l.svg.startsWith("<svg") && l.svg.endsWith("</svg>"))).toBe(true);
  });
});

describe("MusicXML", () => {
  const score = weekScore(composeWeek(weekA, "2026-09-28"), "Week of 28 Sep 2026 & co", "Piano");
  const xml = scoreToMusicXml(score, "Piano");

  it("has a measure per bar, each adding up to 4/4", () => {
    const measures = xml.match(/<measure [^]*?<\/measure>/g)!;
    expect(measures).toHaveLength(7);
    for (const m of measures) {
      const durations = [...m.matchAll(/<duration>(\d+)<\/duration>/g)].map((d) => Number(d[1]));
      expect(durations.reduce((a, b) => a + b, 0)).toBe(16);
    }
  });

  it("names every chord and escapes the title", () => {
    const chords = score.sections[0].bars.reduce((n, bar) => n + bar.chords.length, 0);
    expect(xml.match(/<harmony>/g)).toHaveLength(chords);
    expect(xml).toContain("Week of 28 Sep 2026 &amp; co");
    expect(xml).toContain('<sound tempo="');
  });
});

describe("song choices", () => {
  const at = (y: number, m: number, d: number, note: "C" | "E", mode: "major" | "minor" = "major") => ({
    note,
    mode,
    instrument: "harp" as const,
    timestamp: new Date(y, m, d, 20),
  });

  it("lists weeks and months, newest first, with the seeds Weekly and Monthly use", () => {
    const { weeks, months } = songChoices([
      at(2026, 8, 29, "C"), // Tue 29 Sep: the week of Mon 28 Sep, which starts in September
      at(2026, 9, 6, "E"), // Tue 6 Oct
      at(2026, 9, 14, "C", "minor"), // Wed 14 Oct
    ]);
    expect(weeks.map((w) => w.title)).toEqual(["Week of 12 Oct 2026", "Week of 5 Oct 2026", "Week of 28 Sep 2026"]);
    expect(weeks[2].seed).toBe("2026-09-28");
    expect(months.map((m) => [m.title, m.seed, m.weeks.length])).toEqual([
      ["October 2026", "2026-10-01", 2],
      ["September 2026", "2026-09-01", 1],
    ]);
    expect(months[0].labels).toEqual(["Week of 5 Oct", "Week of 12 Oct"]);
  });
});
