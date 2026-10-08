// A score as MusicXML 4.0, the format MuseScore, Sibelius, Dorico and Finale all open. Uses the same
// bars, accidentals and beams as the drawn score (notation.ts), so both say exactly the same thing.
import type { Chord } from "@/engine";
import { engraveBar, spellClass, type Item } from "./notation";
import type { Score } from "./score";

const DIVISIONS = 4; // per quarter note, so a 16th is 1

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** MusicXML's name for a chord's type. */
export function harmonyKind(chord: Chord): string {
  if (chord.seventh === null) return chord.quality;
  const seventh = (chord.seventh - chord.root + 12) % 12;
  if (chord.quality === "major") return seventh === 11 ? "major-seventh" : "dominant";
  if (chord.quality === "minor") return seventh === 11 ? "major-minor" : "minor-seventh";
  return seventh === 9 ? "diminished-seventh" : "half-diminished";
}

function harmony(chord: Chord, offset: number) {
  const [step, alter] = spellClass(chord.root);
  return (
    `<harmony><root><root-step>${step}</root-step>${alter ? `<root-alter>${alter}</root-alter>` : ""}</root>` +
    `<kind>${harmonyKind(chord)}</kind>${offset ? `<offset>${offset}</offset>` : ""}</harmony>`
  );
}

function note(item: Item) {
  const duration = Math.round(item.length * DIVISIONS);
  const dot = item.dotted ? "<dot/>" : "";
  if (item.kind === "rest")
    return `<note>${item.wholeBar ? '<rest measure="yes"/>' : "<rest/>"}<duration>${duration}</duration><voice>1</voice>${item.wholeBar ? "" : `<type>${item.type}</type>${dot}`}</note>`;
  const { step, alter, octave } = item.pitch;
  return (
    `<note><pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ""}<octave>${octave}</octave></pitch>` +
    `<duration>${duration}</duration>${item.tie ? '<tie type="start"/>' : ""}<voice>1</voice><type>${item.type}</type>${dot}` +
    `${item.accidental ? `<accidental>${item.accidental}</accidental>` : ""}` +
    `${item.beam ? `<beam number="1">${item.beam}</beam>` : ""}` +
    `${item.tie ? '<notations><tied type="start"/></notations>' : ""}</note>`
  );
}

/** Mark the note after each tie start as its end, which MusicXML needs on both notes. */
function closeTies(xml: string[], items: Item[]) {
  items.forEach((item, i) => {
    if (item.kind === "note" && item.tie && xml[i + 1])
      xml[i + 1] = xml[i + 1]
        .replace("<voice>", '<tie type="stop"/><voice>')
        .replace("</note>", '<notations><tied type="stop"/></notations></note>');
  });
}

export function scoreToMusicXml(score: Score, instrument: string): string {
  const measures: string[] = [];
  let number = 0;
  score.sections.forEach((section, s) => {
    section.bars.forEach((bar, b) => {
      number++;
      const parts: string[] = [];
      if (number === 1)
        parts.push(
          `<attributes><divisions>${DIVISIONS}</divisions><key><fifths>0</fifths></key>` +
            `<time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`,
        );
      if (b === 0)
        parts.push(
          `<direction placement="above">${section.label ? `<direction-type><words>${escape(section.label)}</words></direction-type>` : ""}` +
            `<direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${section.tempo}</per-minute></metronome></direction-type>` +
            `<sound tempo="${section.tempo}"/></direction>`,
        );

      // Each chord goes just before the note or rest it falls in, offset if it starts part-way through
      const items = engraveBar(bar.notes);
      const xml = items.map((item) => {
        const chords = bar.chords
          .filter(({ start }) => start >= item.start - 1e-6 && start < item.start + item.length - 1e-6)
          .map(({ chord, start }) => harmony(chord, Math.round((start - item.start) * DIVISIONS)));
        return chords.join("") + note(item);
      });
      closeTies(xml, items);
      parts.push(...xml);

      const last = s === score.sections.length - 1 && b === section.bars.length - 1;
      if (last) parts.push('<barline location="right"><bar-style>light-heavy</bar-style></barline>');
      measures.push(`<measure number="${number}">${parts.join("")}</measure>`);
    });
  });

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n' +
    '<score-partwise version="4.0">' +
    `<work><work-title>${escape(score.title)}</work-title></work>` +
    "<identification><encoding><software>Sonata</software></encoding></identification>" +
    `<part-list><score-part id="P1"><part-name>${escape(instrument)}</part-name></score-part></part-list>` +
    `<part id="P1">${measures.join("")}</part></score-partwise>\n`
  );
}
