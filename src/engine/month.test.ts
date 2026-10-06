import type { Letter, Mode } from '@/data/notes';
import { composeWeek } from './compose';
import { MELODY_HIGH, MELODY_LOW } from './melody';
import { composeMonth, dominantOf, type MonthWeekInput } from './month';
import { chordTones, diatonicChord, pitchClass, type DayNote, type Week } from './theory';

const d = (note: Letter, mode: Mode): DayNote => ({ note, mode });
const B = (note: Letter) => d(note, 'major');
const D = (note: Letter) => d(note, 'minor');

const BRIGHT: Week = [B('C'), B('E'), B('G'), B('F'), B('D'), B('G'), B('C')]; // quick
const HEAVY: Week = [D('C'), D('E'), D('G'), D('B'), D('C'), D('A'), D('G')]; // slow
const MIXED: Week = [B('A'), null, D('D'), B('G'), null, D('F'), B('E')];
const EMPTY: Week = Array(7).fill(null);

const MONTH: MonthWeekInput[] = [
  { week: BRIGHT, seed: '2026-10-05' },
  { week: HEAVY, seed: '2026-10-12' },
  { week: EMPTY, seed: '2026-10-19' }, // no check-ins: left out
  { week: MIXED, seed: '2026-10-26' },
];

describe('composeMonth', () => {
  it('joins the weeks with songs, with a one-bar link between each pair', () => {
    const song = composeMonth(MONTH, '2026-10');
    expect(song.sections.map((s) => s.kind)).toEqual(['week', 'link', 'week', 'link', 'week']);
    // The parts follow on from each other exactly, and fill the song
    song.sections.forEach((s, i) => {
      if (i > 0) expect(s.start).toBeCloseTo(song.sections[i - 1].start + song.sections[i - 1].beats);
    });
    const last = song.sections[song.sections.length - 1];
    expect(song.beats).toBeCloseTo(last.start + last.beats);
  });

  it('keeps each week exactly as it sounds on its own, at its own pace', () => {
    const song = composeMonth(MONTH, '2026-10');
    const heavy = composeWeek(HEAVY, '2026-10-12');
    const section = song.sections[2];
    const stretch = song.tempo / heavy.tempo;
    const inSection = song.events.filter(
      (e) => e.part === 'melody' && e.start >= section.start - 1e-9 && e.start < section.start + section.beats - 1e-9,
    );
    const own = heavy.events.filter((e) => e.part === 'melody');
    expect(inSection.map((e) => e.midi)).toEqual(own.map((e) => e.midi));
    inSection.forEach((e, i) => {
      expect(e.start).toBeCloseTo(section.start + own[i].start * stretch);
      expect(e.duration).toBeCloseTo(own[i].duration * stretch);
    });
  });

  it('plays the same song as Weekly when the month has one week', () => {
    const song = composeMonth([{ week: MIXED, seed: 'w' }]);
    expect(song.events).toEqual(composeWeek(MIXED, 'w').events);
    expect(song.sections).toEqual([{ kind: 'week', start: 0, beats: 28 }]);
  });

  it('leads each link into the next week through the dominant of its first chord', () => {
    const song = composeMonth(MONTH, '2026-10');
    const link = song.sections[1];
    const next = composeWeek(HEAVY, '2026-10-12');
    const target = next.bars[0].chords[0].chord;
    const lastHalf = song.events.filter(
      (e) => e.part === 'chords' && e.start > link.start + link.beats / 2 - 1e-9 && e.start < link.start + link.beats - 1e-9,
    );
    expect(lastHalf.map((e) => pitchClass(e.midi)).sort()).toEqual([...chordTones(dominantOf(target))].sort());
  });

  it('writes link melodies that stay in range and never overlap a note', () => {
    const melody = composeMonth(MONTH, '2026-10').events.filter((e) => e.part === 'melody');
    for (const e of melody) {
      expect(e.midi).toBeGreaterThanOrEqual(MELODY_LOW - 2);
      expect(e.midi).toBeLessThanOrEqual(MELODY_HIGH + 2);
    }
    melody.slice(1).forEach((e, i) => expect(e.start).toBeGreaterThanOrEqual(melody[i].start + melody[i].duration - 1e-9));
  });

  it('is deterministic', () => {
    expect(composeMonth(MONTH, '2026-10')).toEqual(composeMonth(MONTH, '2026-10'));
  });

  it('refuses a month with no check-ins', () => {
    expect(() => composeMonth([{ week: EMPTY, seed: 'x' }])).toThrow();
  });
});

describe('dominantOf', () => {
  it('approaches A minor from E7', () => {
    expect(chordTones(dominantOf(diatonicChord('ionian', 5)))).toEqual([4, 8, 11, 2]); // E G♯ B D
  });
});