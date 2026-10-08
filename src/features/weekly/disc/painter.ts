// The few drawing operations the disc scenes need. The app paints them with Skia (skiaPainter.ts); tests record them, so the scenes can be checked without a screen.

export type Gradient = {
  /** Centre and radius of a radial gradient. */
  x: number;
  y: number;
  r: number;
  colours: readonly string[];
  /** Opacity of each colour (default 1). */
  alphas?: readonly number[];
  /** Where each colour sits, 0–1 (default evenly spaced). */
  stops?: readonly number[];
};

export type Brush = {
  colour?: string;
  alpha?: number;
  gradient?: Gradient;
  /** Outline width; omit to fill. */
  stroke?: number;
  /** Soft edge, in pixels. */
  blur?: number;
  /** Add light rather than paint over (screen blending), for glows. */
  glow?: boolean;
};

export type Point = readonly [number, number];

export interface Painter {
  circle(x: number, y: number, r: number, brush: Brush): void;
  /** Part of a circle's outline. Angles in degrees, clockwise from 3 o'clock. */
  arc(
    cx: number,
    cy: number,
    radius: number,
    start: number,
    sweep: number,
    brush: Brush,
  ): void;
  polyline(points: readonly Point[], closed: boolean, brush: Brush): void;
  rect(x: number, y: number, width: number, height: number, brush: Brush): void;
  /** Only draw inside this circle until the matching restore(). */
  clipCircle(x: number, y: number, r: number): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(degrees: number): void;
  scale(x: number, y: number): void;
}
