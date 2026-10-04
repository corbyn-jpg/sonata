import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { BlurMask, Canvas, Circle, Group, Path, Skia } from "@shopify/react-native-skia";
import { Pause, Play, Rewind, FastForward } from "lucide-react-native";
import colours from "@/theme/colours";

// One continuous capsule that swells into three bumps: back, play (biggest), forward
const SIDE = 28; // radius of the back/forward bumps
const MIDDLE = 42; // radius of the play bump
const NECK = 18; // half-height of the narrow parts between bumps
const GAP = 88; // distance between bump centres
const PAD = 14; // room for the glow
const WIDTH = 2 * (SIDE + GAP) + 2 * PAD;
const HEIGHT = 2 * MIDDLE + 2 * PAD;
const CY = HEIGHT / 2;
const CENTRES = [PAD + SIDE, PAD + SIDE + GAP, PAD + SIDE + 2 * GAP];
const RADII = [SIDE, MIDDLE, SIDE];
const KAPPA = 0.5523; // bezier handle length for a quarter circle

/** The outline: rounded ends, then smooth S-curves over each bump and down into each neck. */
function capsulePath() {
  const path = Skia.Path.Make();
  const [x1, x2, x3] = CENTRES;
  const [r1, r2, r3] = RADII;
  const valleys = [(x1 + x2) / 2, (x2 + x3) / 2];
  // Handle lengths: round like a circle over each bump, gentle through each neck
  const waist = (GAP / 2) * 0.35;

  // Edge = one side (top: -1, bottom: 1), drawn left to right for the top and right to left for the bottom
  const edge = (side: 1 | -1) => {
    const y = (offset: number) => CY + side * offset;
    // [x, height above the centre line, handle length]
    const tops: [number, number, number][] = [
      [x1, r1, KAPPA * r1],
      [valleys[0], NECK, waist],
      [x2, r2, KAPPA * r2],
      [valleys[1], NECK, waist],
      [x3, r3, KAPPA * r3],
    ];
    const points = side === -1 ? tops : [...tops].reverse();
    for (let i = 1; i < points.length; i++) {
      const [ax, ah, aHandle] = points[i - 1];
      const [bx, bh, bHandle] = points[i];
      const dir = Math.sign(bx - ax);
      path.cubicTo(ax + dir * aHandle, y(ah), bx - dir * bHandle, y(bh), bx, y(bh));
    }
  };

  path.moveTo(x1 - r1, CY);
  path.cubicTo(x1 - r1, CY - KAPPA * r1, x1 - KAPPA * r1, CY - r1, x1, CY - r1);
  edge(-1);
  path.cubicTo(x3 + KAPPA * r3, CY - r3, x3 + r3, CY - KAPPA * r3, x3 + r3, CY);
  path.cubicTo(x3 + r3, CY + KAPPA * r3, x3 + KAPPA * r3, CY + r3, x3, CY + r3);
  edge(1);
  path.cubicTo(x1 - KAPPA * r1, CY + r1, x1 - r1, CY + KAPPA * r1, x1 - r1, CY);
  path.close();
  return path;
}

type Props = {
  playing: boolean;
  disabled?: boolean;
  canGoForward: boolean;
  onToggle: () => void;
  onBack: () => void;
  onForward: () => void;
};

/** Back a day / play-pause / forward a day, in one wavy capsule (not three separate buttons). */
export function WavyTransport({ playing, disabled, canGoForward, onToggle, onBack, onForward }: Props) {
  const outline = useMemo(capsulePath, []);
  const iconColour = (enabled: boolean) => (enabled ? colours.textPrimary : colours.textMuted);

  const buttons = [
    { label: "Back a day", onPress: onBack, enabled: !disabled, Icon: Rewind, size: 26 },
    { label: playing ? "Pause" : "Play", onPress: onToggle, enabled: !disabled, Icon: playing ? Pause : Play, size: 30 },
    { label: "Forward a day", onPress: onForward, enabled: !disabled && canGoForward, Icon: FastForward, size: 26 },
  ];

  return (
    <View style={{ width: WIDTH, height: HEIGHT }}>
      <Canvas style={{ width: WIDTH, height: HEIGHT }}>
        <Path path={outline} color={colours.violet[500]} opacity={0.3}>
          <BlurMask blur={10} style="outer" />
        </Path>
        <Path path={outline} color={colours.surfaceRaised} opacity={0.92} />
        <Path path={outline} style="stroke" strokeWidth={1.5} color={colours.border} />
        <Group opacity={disabled ? 0.5 : 1}>
          <Circle cx={CENTRES[1]} cy={CY} r={MIDDLE - 6} color={colours.violet[500]} opacity={0.6}>
            <BlurMask blur={8} style="normal" />
          </Circle>
          <Circle cx={CENTRES[1]} cy={CY} r={MIDDLE - 6} color={colours.violet[700]} />
        </Group>
      </Canvas>

      {buttons.map(({ label, onPress, enabled, Icon, size }, i) => (
        <Pressable
          key={label}
          onPress={onPress}
          disabled={!enabled}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: !enabled }}
          style={{
            position: "absolute",
            left: CENTRES[i] - RADII[i],
            top: CY - RADII[i],
            width: 2 * RADII[i],
            height: 2 * RADII[i],
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon color={iconColour(enabled)} size={size} strokeWidth={1.5} fill={i === 1 && !playing ? iconColour(enabled) : "none"} />
        </Pressable>
      ))}
    </View>
  );
}