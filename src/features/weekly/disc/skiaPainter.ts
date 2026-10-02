import {
  BlendMode,
  BlurStyle,
  ClipOp,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkCanvas,
} from "@shopify/react-native-skia";
import type { Brush, Painter } from "./painter";

const colourOf = (hex: string, alpha = 1) => {
  const colour = Skia.Color(hex);
  colour[3] *= alpha;
  return colour;
};

function paintOf(brush: Brush) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  const { gradient } = brush;
  if (gradient) {
    paint.setShader(
      Skia.Shader.MakeRadialGradient(
        { x: gradient.x, y: gradient.y },
        gradient.r,
        gradient.colours.map((c, i) => colourOf(c, gradient.alphas?.[i] ?? 1)),
        gradient.stops ? [...gradient.stops] : null,
        TileMode.Clamp,
      ),
    );
  } else {
    paint.setColor(colourOf(brush.colour ?? "#FFFFFF", brush.alpha ?? 1));
  }
  if (brush.stroke) {
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(brush.stroke);
    paint.setStrokeCap(StrokeCap.Round);
    paint.setStrokeJoin(StrokeJoin.Round);
  }
  if (brush.blur) paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, brush.blur, true));
  if (brush.glow) paint.setBlendMode(BlendMode.Screen);
  return paint;
}

/** Paints the disc scenes onto a Skia canvas. */
export function skiaPainter(canvas: SkCanvas): Painter {
  return {
    circle: (x, y, r, brush) => canvas.drawCircle(x, y, r, paintOf(brush)),
    arc: (cx, cy, radius, start, sweep, brush) => {
      const path = Skia.Path.Make();
      path.addArc(Skia.XYWHRect(cx - radius, cy - radius, 2 * radius, 2 * radius), start, sweep);
      canvas.drawPath(path, paintOf(brush));
    },
    polyline: (points, closed, brush) => {
      const path = Skia.Path.Make();
      points.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
      if (closed) path.close();
      canvas.drawPath(path, paintOf(brush));
    },
    rect: (x, y, width, height, brush) => canvas.drawRect(Skia.XYWHRect(x, y, width, height), paintOf(brush)),
    clipCircle: (x, y, r) => {
      const path = Skia.Path.Make();
      path.addCircle(x, y, r);
      canvas.clipPath(path, ClipOp.Intersect, true);
    },
    save: () => {
      canvas.save();
    },
    restore: () => canvas.restore(),
    translate: (x, y) => canvas.translate(x, y),
    rotate: (degrees) => canvas.rotate(degrees, 0, 0),
    scale: (x, y) => canvas.scale(x, y),
  };
}