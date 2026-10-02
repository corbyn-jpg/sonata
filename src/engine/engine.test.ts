import { LETTERS, type Letter, type Mode } from '@/data/notes';
import { composeWeek } from './compose';
import { chooseChord, chordOptions, OPENING, TRANSITIONS, voiceChord } from './harmony';
import { hasLowMoodRun, movingAverage } from './lowMood';
import { MELODY_HIGH, MELODY_LOW } from './melody';
import { endsInPicardy, evaluateMode } from './mode';
import { hashString, pickWeighted, seededRandom } from './random';
import { chordTones, diatonicChord, pitchClass, SCALES, type DayNote, type Week, type WeekMode } from './theory';

const d = (note: Letter, mode: Mode): DayNote => ({ note, mode });
const B = (note: Letter) => d(note, 'major');
const D = (note: Letter) => d(note, 'minor');

// The spec's fixture: C4, E♭4, G4, B♭4, C5, A♭4, G4
const FIXTURE: Week = [D('C'), D('E'), D('G'), D('B'), D('C'), D('A'), D('G')];
const BRIGHT: Week = [B('C'), B('E'), B('G'), B('F'), B('D'), B('G'), B('C')];
const MODES: WeekMode[] = ['ionian', 'lydian', 'dorian', 'aeolian'];

/** Every week a user could produce, sampled: random notes, modes and missed days. */
function randomWeeks(count: number): Week[] {
  const random = seededRandom(42);
  return Array.from({ length: count }, () =>
    Array.from({ length: 7 }, () =>
      random() < 0.2 ? null : d(LETTERS[Math.floor(random() * 7)], random() < 0.5 ? 'major' : 'minor'),
    ),
  ).filter((week) => week.some(Boolean));
}

const melodyOf = (week: Week, seed = 'w') =>
  composeWeek(week, seed).events.filter((e) => e.part === 'melody');

describe('random', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = seededRandom(hashString('2026-09-28'));
    const b = seededRandom(hashString('2026-09-28'));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('never picks an item with zero weight', () => {
    const random = seededRandom(1);
    for (let i = 0; i < 200; i++) expect(pickWeighted(['a', 'b', 'c'], [1, 0, 1], random)).not.toBe('b');
  });
});

describe('evaluateMode', () => {
  it('writes a steady Bright week in Ionian', () => {
    expect(evaluateMode([B('C'), B('D'), B('G')])).toBe('ionian');
  });

  it('writes a very bright week in Lydian', () => {
    expect(evaluateMode([B('E'), B('A'), B('B')])).toBe('lydian');
  });

  it('writes a heavy Dark week in Aeolian', () => {
    expect(evaluateMode([D('C'), D('A'), D('D')])).toBe('aeolian');
  });

  it('writes a mixed, mostly Dark week in Dorian', () => {
    expect(evaluateMode([D('E'), D('G'), B('A')])).toBe('dorian');
  });

  it('settles an even split by average valence', () => {
    expect(evaluateMode([B('E'), D('E')])).toBe('ionian'); // 9 and 5
    expect(evaluateMode([B('G'), D('C')])).toBe('dorian'); // 6 and 2
  });
});

describe('endsInPicardy', () => {
  it('lifts a Dark week whose last day was Bright', () => {
    expect(endsInPicardy([D('C'), D('A'), B('E')], 'aeolian')).toBe(true);
  });

  it('lifts a Dark week that brightens towards the end', () => {
    expect(endsInPicardy([D('A'), D('C'), D('G'), D('E')], 'aeolian')).toBe(true); // 2, 2 → 4, 5
  });

  it('leaves a week that stays heavy, or gets heavier, in minor', () => {
    expect(endsInPicardy([D('E'), D('G'), D('A'), D('C')], 'aeolian')).toBe(false);
  });

  it('never applies to a major week', () => {
    expect(endsInPicardy([B('C'), B('E')], 'ionian')).toBe(false);
  });
});

describe('harmony', () => {
  it('has transition odds that add up to 1 from every chord', () => {
    for (const row of [...TRANSITIONS, OPENING]) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it('finds a chord containing every pitch the orbs can play, in every mode', () => {
    for (const mode of MODES)
      for (const pc of [0, 2, 3, 4, 5, 7, 8, 9, 10, 11])
        for (const { chord } of chordOptions(pc, mode)) expect(chordTones(chord)).toContain(pc);
  });

  it('borrows a 7th chord when the note is outside the mode (E natural in a minor week)', () => {
    const options = chordOptions(4, 'aeolian');
    expect(options.every(({ chord }) => chord.borrowed && chord.seventh !== null)).toBe(true);
  });

  it('avoids diminished chords', () => {
    const random = seededRandom(3);
    for (const mode of MODES)
      for (let i = 0; i < 100; i++)
        expect(chooseChord(11, mode, null, random).quality).not.toBe('diminished'); // B sits in vii°
  });

  it('moves each chord to the nearest inversion', () => {
    const c = voiceChord(diatonicChord('ionian', 0), null); // C E G
    const f = voiceChord(diatonicChord('ionian', 3), c); // F A C, as C F A: only two notes move
    expect(f.reduce((sum, n, i) => sum + Math.abs(n - c[i]), 0)).toBeLessThanOrEqual(3);
  });
});

describe('composeWeek', () => {
  it('composes the spec fixture into 7 bars in a minor mode', () => {
    const song = composeWeek(FIXTURE, '2026-09-28');
    expect(song.bars).toHaveLength(7);
    expect(song.beats).toBe(28);
    expect(['aeolian', 'dorian']).toContain(song.mode);
  });

  it('puts each day’s own pitch on the first beat of its bar', () => {
    const melody = melodyOf(FIXTURE);
    const expected = [0, 3, 7, 10, 0, 8, 7]; // C E♭ G B♭ C A♭ G
    expected.forEach((pc, day) => {
      const downbeat = melody.find((e) => e.start === day * 4);
      expect(downbeat && pitchClass(downbeat.midi)).toBe(pc);
    });
  });

  it('gives every bar a chord that contains that day’s note', () => {
    for (const week of randomWeeks(200)) {
      const song = composeWeek(week, 'x');
      const melody = song.events.filter((e) => e.part === 'melody');
      song.bars.forEach((bar) => {
        if (!bar.checkin) return;
        const anchor = melody.find((e) => e.start === bar.day * 4)!;
        expect(chordTones(bar.chords[0].chord)).toContain(pitchClass(anchor.midi));
      });
    }
  });

  it('rests the melody on a missed day and holds the chord before', () => {
    const week: Week = [B('C'), B('F'), null, B('G'), B('E'), B('D'), B('C')];
    const song = composeWeek(week, 'w');
    expect(song.events.some((e) => e.part === 'melody' && e.start >= 8 && e.start < 12)).toBe(false);
    expect(song.bars[2].chords[0].chord).toEqual(song.bars[1].chords[0].chord);
  });

  it('always ends on the home chord with the melody on C', () => {
    for (const week of randomWeeks(200)) {
      const song = composeWeek(week, 'end');
      const lastChord = song.bars[6].chords[song.bars[6].chords.length - 1];
      expect(lastChord.chord.root).toBe(0);
      expect(lastChord.start + lastChord.duration).toBe(28);
      const melody = song.events.filter((e) => e.part === 'melody');
      expect(pitchClass(melody[melody.length - 1].midi)).toBe(0);
    }
  });

  it('ends a rising Dark week on a major chord (Picardy third)', () => {
    const week: Week = [D('A'), D('C'), D('D'), D('F'), D('E'), D('G'), B('C')];
    const song = composeWeek(week, 'p');
    expect(song.picardy).toBe(true);
    expect(song.bars[6].chords.at(-1)!.chord.quality).toBe('major');
  });

  it('keeps a Bright week entirely in its scale', () => {
    const song = composeWeek(BRIGHT, 'b');
    for (const e of song.events) expect(SCALES[song.mode]).toContain(pitchClass(e.midi));
  });

  it('keeps the melody in range and smooth (no leap over an octave)', () => {
    for (const week of randomWeeks(300)) {
      const melody = melodyOf(week, 'r');
      melody.forEach((e, i) => {
        expect(e.midi).toBeGreaterThanOrEqual(MELODY_LOW - 2);
        expect(e.midi).toBeLessThanOrEqual(MELODY_HIGH + 2);
        if (i > 0 && e.start === melody[i - 1].start + melody[i - 1].duration)
          expect(Math.abs(e.midi - melody[i - 1].midi)).toBeLessThanOrEqual(12);
      });
    }
  });

  it('fills every bar exactly: melody notes never overlap or overrun', () => {
    for (const week of randomWeeks(200)) {
      const melody = melodyOf(week, 'f');
      for (let i = 1; i < melody.length; i++)
        expect(melody[i].start).toBeGreaterThanOrEqual(melody[i - 1].start + melody[i - 1].duration);
      const last = melody[melody.length - 1];
      expect(last.start + last.duration).toBe(28);
    }
  });

  it('is deterministic: the same week and seed give the same song', () => {
    expect(composeWeek(FIXTURE, 'a')).toEqual(composeWeek(FIXTURE, 'a'));
  });

  it('slows down for heavier weeks', () => {
    expect(composeWeek(FIXTURE).tempo).toBeLessThan(composeWeek(BRIGHT).tempo);
  });

  it('picks the two most common check-ins for the artwork', () => {
    expect(composeWeek(BRIGHT).palette).toEqual([B('C'), B('G')]);
    expect(composeWeek([B('E'), null, null, null, null, null, null]).palette).toEqual([B('E'), B('E')]);
  });

  it('refuses an empty week', () => {
    expect(() => composeWeek(Array(7).fill(null))).toThrow();
  });
});

describe('hasLowMoodRun', () => {
  it('flags 4 Dark check-ins in a row', () => {
    expect(hasLowMoodRun([B('C'), D('C'), D('D'), D('E'), D('F'), B('G'), B('A')])).toBe(true);
  });

  it('does not flag 3', () => {
    expect(hasLowMoodRun([D('C'), D('D'), D('E'), B('F'), D('G'), D('A'), D('B')])).toBe(false);
  });

  it('skips missed days rather than letting them break the run', () => {
    expect(hasLowMoodRun([D('C'), null, D('D'), null, D('E'), D('F'), null])).toBe(true);
  });

  it('lets a Bright check-in break the run', () => {
    expect(hasLowMoodRun([D('C'), D('D'), B('E'), D('F'), D('G'), D('A'), null])).toBe(false);
  });
});

describe('movingAverage', () => {
  it('averages each value with the ones before it', () => {
    expect(movingAverage([3, 6, 9, 3], 3)).toEqual([3, 4.5, 6, 6]);
  });
});