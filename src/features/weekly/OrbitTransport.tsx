import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { BlurMask, Canvas, Group, Path, Skia } from "@shopify/react-native-skia";
import { FastForward, Pause, Play, Rewind } from "lucide-react-native";
import { Orb } from "@/components/GlowOrb";
import colours from "@/theme/colours";

// A ringed planet, still and calm so the spinning disc above stays the focus: play is the planet,
// back and forward are moons at the ends of its ring.
const WIDTH = 312;
const HEIGHT = 130;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const RX = 120; // ring radii
const RY = 30;
const TILT = (-6 * Math.PI) / 180;
const COS = Math.cos(TILT);
const SIN = Math.sin(TILT);
const PLANET = 38;
const MOON = 23;

/** A point on the (tilted) ring at angle `theta`; θ in 0…π is the near side, in front of the planet. */
function ringPoint(theta: number, scale = 1) {
  const x = RX * scale * Math.cos(theta);
  const y = RY * scale * Math.sin(theta);
  return { x: CX + x * COS - y * SIN, y: CY + x * SIN + y * COS };
}

function ringPath(from: number, to: number, scale = 1) {
  const path = Skia.Path.Make();
  for (let s = 0; s <= 90; s++) {
    const { x, y } = ringPoint(from + ((to - from) * s) / 90, scale);
    if (s === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  return path;
}

// Drawn once: the ring never changes
const BACK = ringPath(Math.PI, 2 * Math.PI);
const FRONT = ringPath(0, Math.PI);
const OUTER_BACK = ringPath(Math.PI, 2 * Math.PI, 1.14);
const OUTER_FRONT = ringPath(0, Math.PI, 1.14);
const MOONS = [ringPoint(Math.PI), ringPoint(0)];

/** Dark icon on a light orb, light on a dark one, so each icon always stands out. */
function iconColourOn(hex: string) {
  const n = parseInt(hex.slice(1, 7), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? colours.canvas : colours.textPrimary;
}

/** Half of the ring: a soft glow under a fine line. */
function Ring({ path, opacity }: { path: ReturnType<typeof ringPath>; opacity: number }) {
  return (
    <>
      <Path path={path} style="stroke" strokeWidth={8} color={colours.violet[500]} opacity={0.5}>
        <BlurMask blur={6} style="normal" />
      </Path>
      <Path path={path} style="stroke" strokeWidth={2.2} color={colours.violet[200]} opacity={opacity} />
    </>
  );
}

type Props = {
  playing: boolean;
  disabled?: boolean;
  canGoForward: boolean;
  /** The week's main orb colours: the play button is drawn like the orbs on Home. */
  orb: { core: string; edge: string };
  /** The week's second orb colours, for the back and forward moons. */
  moon: { core: string; edge: string };
  onToggle: () => void;
  onBack: () => void;
  onForward: () => void;
};

/** Back a day / play-pause / forward a day: one ringed planet rather than three separate buttons. */
export function OrbitTransport({ playing, disabled, canGoForward, orb, moon, onToggle, onBack, onForward }: Props) {
  // Each icon sits on its orb's bright core, so pick dark or light to stand out against it
  const iconColour = useMemo(() => iconColourOn(orb.core), [orb.core]);
  const moonIconColour = useMemo(() => iconColourOn(moon.core), [moon.core]);

  const buttons = [
    { label: "Back a day", onPress: onBack, enabled: !disabled, x: MOONS[0].x, y: MOONS[0].y, size: MOON },
    { label: playing ? "Pause" : "Play", onPress: onToggle, enabled: !disabled, x: CX, y: CY, size: PLANET + 4 },
    { label: "Forward a day", onPress: onForward, enabled: !disabled && canGoForward, x: MOONS[1].x, y: MOONS[1].y, size: MOON },
  ];

  return (
    <View style={{ width: WIDTH, height: HEIGHT }}>
      <Canvas style={{ width: WIDTH, height: HEIGHT }}>
        {/* Far side of the rings, behind the planet */}
        <Path path={OUTER_BACK} style="stroke" strokeWidth={1} color={colours.violet[200]} opacity={0.25} />
        <Ring path={BACK} opacity={0.75} />

        {/* The planet: the week's main orb, drawn exactly like the orbs on Home (no halo) */}
        <Group opacity={disabled ? 0.5 : 1}>
          <Orb cx={CX} cy={CY} size={PLANET * 2} core={orb.core} edge={orb.edge} glow={0} />
        </Group>

        {/* Near side of the rings, passing in front of the planet */}
        <Path path={OUTER_FRONT} style="stroke" strokeWidth={1} color={colours.violet[200]} opacity={0.3} />
        <Ring path={FRONT} opacity={0.95} />

        {/* Moons at the ends of the ring: orbs in the week's second colour */}
        {MOONS.map(({ x, y }, i) => (
          <Group key={i} opacity={buttons[i * 2].enabled ? 1 : 0.45}>
            <Orb cx={x} cy={y} size={MOON * 2} core={moon.core} edge={moon.edge} glow={0} />
          </Group>
        ))}
      </Canvas>

      {buttons.map(({ label, onPress, enabled, x, y, size }, i) => {
        const Icon = i === 1 ? (playing ? Pause : Play) : i === 0 ? Rewind : FastForward;
        const colour = i === 1 ? iconColour : moonIconColour;
        return (
          <Pressable
            key={i}
            onPress={onPress}
            disabled={!enabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: !enabled }}
            style={{
              position: "absolute",
              left: x - size,
              top: y - size,
              width: 2 * size,
              height: 2 * size,
              alignItems: "center",
              justifyContent: "center",
              opacity: enabled || i === 1 ? 1 : 0.45, // dimmed with its moon
            }}
          >
            <Icon color={colour} fill={colour} size={i === 1 ? 28 : 18} strokeWidth={1.5} />
          </Pressable>
        );
      })}
    </View>
  );
}