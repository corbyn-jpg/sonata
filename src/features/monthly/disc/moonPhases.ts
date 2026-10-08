import type { DayNote, Week } from "@/engine";
import { paletteOf } from "@/engine/compose";
import { mean, valencesOf } from "@/engine/mode";
import { hashString, seededRandom } from "@/engine/random";
import {
  orbOf,
  pointAt,
  spindleHole,
  stardust,
  vinyl,
  type Context,
  type Orb,
} from "@/features/weekly/disc/scenes";
import type { Painter } from "@/features/weekly/disc/painter";

// The monthly song's record: the month's moon phases. Each week is a moon on one orbit, in that week's
// colours and fuller for a brighter week; every day of the month is a bead around the rim; the centre
// glows in the month's two most common colours. Same month, same picture.

/**
 How full a week's moon is: a crescent (0.25) for the heaviest weeks up to full (1) for the brightest. A week without check-ins is a new moon (0).
 */
export function moonLight(week: Week): number {
  const logged = week.filter((d): d is DayNote => d !== null);
  if (logged.length === 0) return 0;
  return 0.25 + (mean(valencesOf(logged)) / 10) * 0.75;
}

/** A moon lit from the right: a dark disc slides off to the left as `light` goes from 0 to 1. */
function moon(
  { p, px }: Context,
  x: number,
  y: number,
  r: number,
  orb: Orb,
  light: number,
) {
  if (light === 0) {
    p.circle(x, y, r, { colour: "#FFFFFF", alpha: 0.18, stroke: 1.2 * px }); // new moon: only its edge
    return;
  }
  p.circle(x, y, r * 1.7, { colour: orb.core, alpha: 0.3, blur: r * 0.6 });
  p.circle(x, y, r, {
    gradient: {
      x: x - r * 0.3,
      y: y - r * 0.3,
      r: r * 1.4,
      colours: [orb.core, orb.edge, "#05030A"],
      stops: [0, 0.6, 1],
    },
  });
  p.save();
  p.clipCircle(x, y, r);
  p.circle(x - r * 2 * light, y, r * 1.05, {
    colour: "#07040C",
    alpha: 0.92,
    blur: r * 0.12,
  });
  p.restore();
  p.circle(x, y, r, { colour: "#FFFFFF", alpha: 0.18, stroke: 1.2 * px });
}

/**
 Paints the month's record onto `painter`, filling a `size` × `size` square.
 `days`: every day of the month in order (null where there was no check-in), for the beads round the rim.
 `weeks`: the weeks that start in the month, one moon each. `seed` (e.g. the month's first day) varies the stars.
 */
export function drawMonthDisc(
  painter: Painter,
  size: number,
  days: readonly (DayNote | null)[],
  weeks: readonly Week[],
  seed: string,
) {
  const r = size / 2;
  const logged = days.filter((d): d is DayNote => d !== null);
  const [main, second] = paletteOf(logged.length ? logged : weeks.flat());
  const ctx: Context = {
    p: painter,
    c: r,
    r,
    px: r / 280,
    random: seededRandom(hashString(`${seed}moon${JSON.stringify(days)}`)),
    week: days,
    palette: [orbOf(main), orbOf(second)],
  };
  const { p, c, px } = ctx;

  p.save();
  p.clipCircle(r, r, r);
  vinyl(ctx, "#120E22");
  stardust(ctx, 180);

  // A bead for every day of the month round the rim: lit in its orb's colour, or faint if missed
  days.forEach((day, i) => {
    const [x, y] = pointAt(
      ctx,
      -Math.PI / 2 + (i / days.length) * Math.PI * 2,
      r * 0.9,
    );
    if (!day)
      return p.circle(x, y, 2.4 * px, {
        colour: "#FFFFFF",
        alpha: 0.25,
        stroke: px,
      });
    p.circle(x, y, 9 * px, {
      colour: orbOf(day).core,
      alpha: 0.35,
      blur: 5 * px,
    });
    p.circle(x, y, 4.2 * px, { colour: orbOf(day).core, alpha: 0.95 });
  });

  // One moon per week on a faint orbit, starting at the top and going clockwise
  p.circle(c, c, r * 0.6, { colour: "#F3EBFA", alpha: 0.25, stroke: 1.2 * px });
  weeks.forEach((week, i) => {
    const [x, y] = pointAt(
      ctx,
      -Math.PI / 2 + (i / weeks.length) * Math.PI * 2,
      r * 0.6,
    );
    const logged = week.filter((d): d is DayNote => d !== null);
    const colour = logged.length ? orbOf(paletteOf(week)[0]) : ctx.palette[0];
    moon(ctx, x, y, r * 0.13, colour, moonLight(week));
  });

  // The centre: the month's two most common colours
  const L = r * 0.22;
  p.circle(c, c, L * 1.4, {
    colour: ctx.palette[0].core,
    alpha: 0.45,
    blur: L * 0.4,
  });
  p.circle(c, c, L, {
    gradient: {
      x: c,
      y: c,
      r: L,
      colours: [ctx.palette[0].core, ctx.palette[1].core, ctx.palette[1].edge],
      stops: [0, 0.6, 1],
    },
  });
  spindleHole(ctx);
  p.restore();
}
