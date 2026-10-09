import { emotionOf } from "@/data/notes";
import { dataReport } from "./dataReport";

const madeAt = new Date(2026, 9, 9, 12);

describe("data report", () => {
  const html = dataReport({
    checkins: [
      {
        note: "E",
        mode: "minor",
        instrument: "harp",
        reflection: "Long day <b>at</b> the studio",
        timestamp: new Date(2026, 9, 6, 21),
      },
      { note: "C", mode: "major", timestamp: new Date(2026, 9, 7, 20) },
    ],
    thoughts: [
      {
        situation: "Crit",
        thought: "They'll hate it",
        pattern: "mind-reading",
        balanced: "One comment isn't everyone",
        updatedAt: madeAt.getTime(),
      },
    ],
    playlists: [
      {
        name: "Sunday & rain",
        songs: [
          {
            kind: "week",
            week: "2026-09-28",
            instrument: "piano",
            days: [null, null, null, null, null, null, null],
          },
          {
            kind: "piece",
            id: "p1",
            name: "Rain <again>",
            instrument: "harp",
            piece: {
              mode: "minor",
              steps: ["E", null, "C"],
              tempo: 96,
              harmony: true,
            },
          },
        ],
      },
    ],
    pieces: [
      {
        name: "Rain <again>",
        instrument: "harp",
        piece: {
          mode: "minor",
          steps: ["E", null, "C", "G", "B"],
          tempo: 96,
          harmony: true,
        },
        updatedAt: madeAt.getTime(),
      },
    ],
    madeAt,
  });

  it("lists check-ins newest first, by note and major or minor", () => {
    expect(html.indexOf("Wed 7 Oct 2026")).toBeLessThan(
      html.indexOf("Tue 6 Oct 2026"),
    );
    expect(html).toContain("E♭");
    expect(html).toContain("Minor");
    expect(html).toContain("Harp");
  });

  it("never shows emotion words", () => {
    expect(html).not.toContain(emotionOf("E", "minor"));
    expect(html).not.toContain(emotionOf("C", "major"));
  });

  it("escapes what the user wrote", () => {
    expect(html).toContain("Long day &lt;b&gt;at&lt;/b&gt; the studio");
    expect(html).toContain("Sunday &amp; rain");
    expect(html).not.toContain("<b>at</b>");
  });

  it("includes thought records with their pattern, and playlists with their weeks", () => {
    expect(html).toContain("Mind reading");
    expect(html).toContain("One comment isn't everyone");
    expect(html).toContain("Week of 28 Sep 2026 · Piano");
    expect(html).toContain("Rain &lt;again&gt; (your piece) · Harp");
  });

  it("writes out each piece's notes a bar at a time", () => {
    expect(html).toContain("Minor · 96 bpm · Harp · with harmony");
    expect(html).toContain("E♭ – C G | B♭");
  });

  it("counts everything and warns that the copy isn't encrypted", () => {
    expect(html).toContain(
      "2 check-ins · 1 thought record · 1 playlist · 1 piece",
    );
    expect(html).toContain("isn't encrypted");
  });

  it("says so when there's nothing yet", () => {
    const empty = dataReport({
      checkins: [],
      thoughts: [],
      playlists: [],
      pieces: [],
      madeAt,
    });
    expect(empty).toContain("No check-ins yet.");
    expect(empty).toContain("No thought records yet.");
    expect(empty).toContain("No playlists yet.");
    expect(empty).toContain("No pieces yet.");
  });
});
