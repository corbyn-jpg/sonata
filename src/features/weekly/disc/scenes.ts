import { valenceOf } from "@/data/notes";
import type { DayNote, WeekMode } from "@/engine";
import { hashString, seededRandom } from "@/engine/random";
import colours from "@/theme/colours";
import type { Painter, Point } from "./painter";

// The record's face is a little space scene painted from the week: every logged day becomes a planet, comet or ribbon of light in its orb's colours, sized by how bright the day was. The scene itself shows the mode the AI wrote the song in. Same week, same picture; every week is unique.

export type Scene = "solarSystem" | "aurora" | "comets" | "eclipse";

export const SCENE_FOR_MODE: Record<WeekMode, Scene> = {
  ionian: "solarSystem", // steady and bright: orderly orbits
  lydian: "aurora", // ethereal: floating ribbons of light
  dorian: "comets", // thoughtful: journeys in motion
  aeolian: "eclipse", // heavy: a dark centre with light all around it
};

export type Orb = { core: string; edge: string };
export type Context = {
  p: Painter;
  /** Centre and radius of the disc. */
  c: number;
  r: number;
  /** One pixel at the size the scenes were designed at, for fine details. */
  px: number;
  random: () => number;
  week: readonly (DayNote | null)[];
  palette: readonly [Orb, Orb];
};

export const orbOf = (day: DayNote): Orb => colours.orb[day.note][day.mode];
const logged = (week: readonly (DayNote | null)[]) =>
  week.flatMap((day, i) => (day ? [{ ...day, day: i }] : []));
export const pointAt = (
  { c }: Context,
  angle: number,
  distance: number,
): Point => [c + Math.cos(angle) * distance, c + Math.sin(angle) * distance];

/** Black vinyl with fine grooves. */
export function vinyl(
  { p, c, r, px }: Context,
  inner = "#16101F",
  outer = "#07040C",
) {
  p.circle(c, c, r, { gradient: { x: c, y: c, r, colours: [inner, outer] } });
  for (let k = 0; k < 40; k++)
    p.circle(c, c, r * (0.3 + k * 0.0175), {
      colour: "#FFFFFF",
      alpha: 0.035,
      stroke: px,
    });
}

/** Scattered specks of starlight. */
export function stardust(ctx: Context, count: number) {
  const { p, r, px, random } = ctx;
  for (let i = 0; i < count; i++) {
    const [x, y] = pointAt(
      ctx,
      random() * Math.PI * 2,
      r * (0.3 + random() * 0.68),
    );
    const size = random() < 0.08 ? 2.2 : 0.6 + random() * 1.2;
    p.circle(x, y, size * px, {
      colour: "#FFFFFF",
      alpha: 0.35 + random() * 0.6,
    });
  }
}

/** The small dark spindle hole in the middle. */
export function spindleHole({ p, c, r, px }: Context) {
  p.circle(c, c, r * 0.045, { colour: colours.canvas });
  p.circle(c, c, r * 0.045, { colour: "#FFFFFF", alpha: 0.3, stroke: 2 * px });
}

/** A shaded planet in a day's colours, optionally ringed. */
function planet(
  { p }: Context,
  x: number,
  y: number,
  size: number,
  orb: Orb,
  ringed: boolean,
) {
  const ring = (front: boolean) => {
    p.save();
    p.translate(x, y);
    p.rotate(-20);
    p.scale(1, 0.32);
    const brush = { colour: "#F3EBFA", alpha: 0.85, stroke: size * 0.5 };
    if (front)
      p.arc(0, 0, size * 1.75, 0, 180, brush); // the near half passes over the planet
    else p.circle(0, 0, size * 1.75, brush);
    p.restore();
  };
  p.circle(x, y, size * 1.7, {
    colour: orb.core,
    alpha: 0.35,
    blur: size * 0.6,
  });
  if (ringed) ring(false);
  p.circle(x, y, size, {
    gradient: {
      x: x - size * 0.35,
      y: y - size * 0.35,
      r: size * 1.4,
      colours: [orb.core, orb.edge, "#05030A"],
      stops: [0, 0.6, 1],
    },
  });
  if (ringed) ring(true);
}

const SCENES: Record<Scene, (ctx: Context) => void> = {
  /** A sun in the middle; each day a planet on its own hand-painted orbit, Monday innermost. */
  solarSystem(ctx) {
    const { p, c, r, px, random, week, palette } = ctx;
    vinyl(ctx);
    stardust(ctx, 160);
    week.forEach((day, i) => {
      const orbit = r * (0.38 + i * 0.085);
      const strokes = 2 + Math.floor(random() * 2);
      let start = random() * 360;
      for (let s = 0; s < strokes; s++) {
        p.arc(c, c, orbit, start, 360 / strokes - 14 - random() * 30, {
          colour: "#F3EBFA",
          alpha: 0.75,
          stroke: r * 0.008,
        });
        start += 360 / strokes;
      }
      if (!day) return;
      const [x, y] = pointAt(ctx, random() * Math.PI * 2, orbit);
      planet(
        ctx,
        x,
        y,
        r * (0.03 + valenceOf(day.note, day.mode) * 0.0045),
        orbOf(day),
        i % 3 === 1,
      );
    });
    // The sun: the week's main colour, with faint swirls
    const L = r * 0.27;
    p.circle(c, c, L * 1.25, {
      colour: palette[0].core,
      alpha: 0.5,
      blur: L * 0.3,
    });
    p.circle(c, c, L, {
      gradient: {
        x: c,
        y: c,
        r: L,
        colours: [palette[0].core, palette[0].edge],
      },
    });
    for (let k = 1; k < 6; k++)
      p.arc(c, c, (L * k) / 6, k * 50, 200, {
        colour: "#FFFFFF",
        alpha: 0.12,
        stroke: 2 * px,
      });
    spindleHole(ctx);
  },

  /** Ribbons of light rippling round the record, one per day; brighter days ripple more. */
  aurora(ctx) {
    const { p, c, r, random, week, palette } = ctx;
    vinyl(ctx, "#0E1024", "#05040C");
    stardust(ctx, 200);
    for (const day of logged(week)) {
      const base = r * (0.42 + day.day * 0.075);
      const waves = 3 + Math.floor(random() * 4);
      const phase = random() * Math.PI * 2;
      const ripple = r * (0.01 + valenceOf(day.note, day.mode) * 0.004);
      const ribbon: Point[] = [];
      for (let s = 0; s < 180; s++) {
        const a = (s / 180) * Math.PI * 2;
        ribbon.push(
          pointAt(ctx, a, base + Math.sin(a * waves + phase) * ripple),
        );
      }
      const { core } = orbOf(day);
      p.polyline(ribbon, true, {
        colour: core,
        alpha: 0.35,
        stroke: r * 0.05,
        blur: r * 0.025,
        glow: true,
      });
      p.polyline(ribbon, true, {
        colour: core,
        alpha: 0.8,
        stroke: r * 0.006,
        glow: true,
      });
    }
    const L = r * 0.27;
    p.circle(c, c, L, {
      gradient: {
        x: c,
        y: c,
        r: L,
        colours: [palette[0].core, palette[1].core],
      },
    });
    spindleHole(ctx);
  },

  /** Each day a comet sweeping round the record, its tail in the day's colour; a planet at the centre. */
  comets(ctx) {
    const { p, c, r, random, week, palette } = ctx;
    vinyl(ctx);
    stardust(ctx, 220);
    for (const day of logged(week)) {
      const radius = r * (0.4 + day.day * 0.08);
      const head = -90 + (day.day * 360) / 7 + (random() - 0.5) * 30; // spread round the week like a clock
      const length = 50 + valenceOf(day.note, day.mode) * 8; // degrees of tail
      const { core } = orbOf(day);
      // The tail: overlapping arcs, wider and brighter towards the head
      for (let k = 0; k < 12; k++) {
        const t = k / 12;
        p.arc(
          c,
          c,
          radius,
          head - length * (1 - t),
          length * (1 - t) * 0.25 + 2,
          {
            colour: core,
            alpha: 0.12 + t * 0.35,
            stroke: r * (0.004 + t * 0.024),
            blur: r * 0.008,
          },
        );
      }
      const [x, y] = pointAt(ctx, (head * Math.PI) / 180, radius);
      p.circle(x, y, r * 0.05, { colour: core, alpha: 0.6, blur: r * 0.025 });
      p.circle(x, y, r * 0.018, { colour: "#FFFFFF" });
    }
    // A cloudy planet in the week's two colours
    const L = r * 0.27;
    p.circle(c, c, L * 1.3, {
      colour: palette[0].core,
      alpha: 0.4,
      blur: L * 0.3,
    });
    p.circle(c, c, L, {
      gradient: {
        x: c - L * 0.35,
        y: c - L * 0.35,
        r: L * 1.5,
        colours: [palette[0].core, palette[1].edge, "#05030A"],
        stops: [0, 0.6, 1],
      },
    });
    p.save();
    p.clipCircle(c, c, L);
    for (let k = 0; k < 4; k++)
      p.rect(c - L, c - L * 0.6 + k * L * 0.4, 2 * L, L * 0.12, {
        colour: "#FFFFFF",
        alpha: 0.08,
        blur: L * 0.04,
      });
    p.restore();
    spindleHole(ctx);
  },

  /** A dark sun with a corona: rays in each day's colour, longer for brighter days. */
  eclipse(ctx) {
    const { p, c, r, px, random, week, palette } = ctx;
    vinyl(ctx);
    stardust(ctx, 200);
    const L = r * 0.27;
    p.circle(c, c, L * 1.6, {
      colour: palette[0].core,
      alpha: 0.45,
      blur: L * 0.4,
    });
    for (const day of logged(week)) {
      const reach = 0.4 + valenceOf(day.note, day.mode) * 0.12;
      for (let i = 0; i < 26; i++) {
        const a = random() * Math.PI * 2;
        const length = L * (0.2 + random() * reach);
        p.polyline([pointAt(ctx, a, L), pointAt(ctx, a, L + length)], false, {
          colour: orbOf(day).core,
          alpha: 0.25 + random() * 0.4,
          stroke: (1 + random() * 3) * px,
          blur: 1.5 * px,
          glow: true,
        });
      }
    }
    p.circle(c, c, L * 1.02, {
      colour: "#FFFFFF",
      alpha: 0.9,
      stroke: 2.5 * px,
      blur: 2 * px,
    });
    p.circle(c, c, L, { colour: "#07040C" });
    p.circle(c, c, r * 0.045, {
      colour: "#FFFFFF",
      alpha: 0.25,
      stroke: 2 * px,
    });
  },
};

/**
 Paints the record for a week onto `painter`, filling a `size` × `size` square. `seed` (e.g. the week's Monday) varies the layout between weeks; the same inputs always give the same picture.
 */
export function drawDisc(
  painter: Painter,
  size: number,
  week: readonly (DayNote | null)[],
  palette: readonly [DayNote, DayNote],
  mode: WeekMode,
  seed: string,
) {
  const r = size / 2;
  const notes = week.map((day) => day && { note: day.note, mode: day.mode });
  const ctx: Context = {
    p: painter,
    c: r,
    r,
    px: r / 280,
    random: seededRandom(hashString(`${seed}${mode}${JSON.stringify(notes)}`)),
    week,
    palette: [orbOf(palette[0]), orbOf(palette[1])],
  };
  painter.save();
  painter.clipCircle(r, r, r);
  SCENES[SCENE_FOR_MODE[mode]](ctx);
  painter.restore();
}
