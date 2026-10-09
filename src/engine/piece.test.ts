import type { Letter } from "@/data/notes";
import { composePiece, PIECE_STEPS, type Piece } from "./piece";
import { chordTones } from "./theory";

/** A piece from a string of letters, one per step ("-" is a rest), padded to 16 steps. */
const piece = (tune: string, more: Partial<Piece> = {}): Piece => ({
  mode: "major",
  tempo: 96,
  harmony: false,
  steps: [...tune.padEnd(PIECE_STEPS, "-")].map((c) =>
    c === "-" ? null : (c as Letter),
  ),
  ...more,
});

const melody = (p: Piece) =>
  composePiece(p).events.filter((e) => e.part === "melody");

describe("composer pieces", () => {
  it("plays each note on its step, one beat long, and rests in between", () => {
    expect(
      melody(piece("C-E")).map(({ midi, start, duration }) => [
        midi,
        start,
        duration,
      ]),
    ).toEqual([
      [72, 0, 1],
      [76, 2, 1],
    ]);
  });

  it("lowers E, A and B in minor, as on Home", () => {
    expect(melody(piece("EAB", { mode: "minor" })).map((e) => e.midi)).toEqual([
      75, 80, 82,
    ]);
  });

  it("ends with the last bar that has a note in it", () => {
    expect(composePiece(piece("C")).beats).toBe(4);
    expect(composePiece(piece("C----G")).beats).toBe(8);
    expect(composePiece(piece("")).beats).toBe(0);
  });

  it("adds nothing under the tune without harmony", () => {
    const song = composePiece(piece("CDEFG"));
    expect(song.chords).toEqual([]);
    expect(song.events.every((e) => e.part === "melody")).toBe(true);
  });

  it("harmonises each bar with a chord that contains its first note", () => {
    const tune = piece("EDCDEEE-DDD-EGG-", { harmony: true });
    const song = composePiece(tune);
    expect(song.chords).toHaveLength(4);
    const firsts = [4, 4, 2, 4]; // E, E, D, E as pitch classes
    song.chords.forEach((chord, bar) =>
      expect(chordTones(chord)).toContain(firsts[bar]),
    );
    expect(song.events.filter((e) => e.part === "bass")).toHaveLength(4);
  });

  it("gives the same tune the same chords every time, whatever the tempo", () => {
    const a = composePiece(piece("GAGFE-C-", { harmony: true }));
    const b = composePiece(piece("GAGFE-C-", { harmony: true, tempo: 140 }));
    expect(b.chords).toEqual(a.chords);
  });

  it("holds the chord through a bar of rests", () => {
    const song = composePiece(piece("C-------G", { harmony: true }));
    expect(song.chords[1]).toEqual(song.chords[0]);
  });
});
