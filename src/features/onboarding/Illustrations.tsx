import { useMemo } from "react";
import { PixelRatio, View } from "react-native";
import {
  BlurMask,
  Canvas,
  Circle,
  Image,
  LinearGradient,
  Path,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import { useSharedValue } from "react-native-reanimated";
import { Lock } from "lucide-react-native";
import { Orb } from "@/components/GlowOrb";
import { LETTERS } from "@/data/notes";
import { composeWeek, type Week } from "@/engine";
import { NoteStaff } from "@/features/home/NoteStaff";
import { makeDiscArt } from "@/features/weekly/discArt";
import colours from "@/theme/colours";

// The four intro pictures (wireframe 01 First launch). Each is the app's own visual, not a stock graphic: the orb,
// the carousel with its staff, a real record painted by the engine, and the teal orb that stands for privacy.

export const ILLUSTRATION_HEIGHT = 260;
const H = ILLUSTRATION_HEIGHT;

/** A sample week, only for the record on the third screen (nothing is saved). */
export const SAMPLE_WEEK: Week = [
  { note: "E", mode: "major" },
  { note: "C", mode: "major" },
  { note: "A", mode: "minor" },
  { note: "G", mode: "major" },
  null,
  { note: "E", mode: "major" },
  { note: "C", mode: "major" },
];
const SAMPLE_SONG = composeWeek(SAMPLE_WEEK, "intro");
/** The sample record's main colour, for the wash behind the third screen. */
export const SAMPLE_COLOUR =
  colours.orb[SAMPLE_SONG.palette[0].note][SAMPLE_SONG.palette[0].mode].core;

type Props = { width: number };

/** 1 · Welcome: one violet orb inside a tilted orbit, the ring passing behind it and then in front. */
export function RingedOrb({ width }: Props) {
  const cx = width / 2;
  const cy = H / 2;
  const rx = Math.min(width * 0.42, 170);
  const oval = Skia.XYWHRect(cx - rx, cy - 26, rx * 2, 52);
  const behind = Skia.PathBuilder.Make().addArc(oval, 180, 180).build();
  const inFront = Skia.PathBuilder.Make().addArc(oval, 0, 180).build();
  return (
    <Canvas style={{ width, height: H }}>
      <Path
        path={behind}
        style="stroke"
        strokeWidth={1.5}
        color={colours.violet[200]}
        opacity={0.3}
      />
      <Orb
        cx={cx}
        cy={cy}
        size={120}
        core={colours.violet[200]}
        edge={colours.violet[500]}
        aura
      />
      <Path
        path={inFront}
        style="stroke"
        strokeWidth={1.5}
        color={colours.violet[200]}
        opacity={0.7}
      />
    </Canvas>
  );
}

/** 2 · One orb a day: the carousel in miniature, its neighbours soft at the sides, the note on its staff below. */
export function OrbRow({ width }: Props) {
  const cx = width / 2;
  const cy = 96;
  const side = Math.min(width * 0.3, 110);
  const position = useSharedValue(LETTERS.indexOf("E")); // the staff shows E, like the centre orb
  const page = useSharedValue(0); // major
  const E = colours.orb.E.major;
  const D = colours.orb.D.major;
  const F = colours.orb.F.major;
  return (
    <Canvas style={{ width, height: H }}>
      <Orb
        cx={cx - side}
        cy={cy}
        size={56}
        core={D.core}
        edge={D.edge}
        softness={1}
        glow={0.35}
      />
      <Orb
        cx={cx + side}
        cy={cy}
        size={56}
        core={F.core}
        edge={F.edge}
        softness={1}
        glow={0.35}
      />
      <Orb cx={cx} cy={cy} size={104} core={E.core} edge={E.edge} />
      <NoteStaff cx={cx} top={200} page={page} position={position} />
    </Canvas>
  );
}

const DISC = 200;
const RING = DISC / 2 + 12;

/** 3 · Your week becomes a song: a real record, painted by the same code as Weekly, with its progress ring. */
export function SampleRecord({ width }: Props) {
  const cx = width / 2;
  const cy = H / 2;
  const art = useMemo(
    () =>
      makeDiscArt(
        SAMPLE_WEEK,
        SAMPLE_SONG,
        Math.round(DISC * PixelRatio.get()),
        "intro",
      ),
    [],
  );
  const ring = Skia.PathBuilder.Make()
    .addArc(Skia.XYWHRect(cx - RING, cy - RING, RING * 2, RING * 2), -90, 140)
    .build();
  const knob = (140 - 90) * (Math.PI / 180);
  return (
    <Canvas style={{ width, height: H }}>
      <Circle cx={cx} cy={cy} r={DISC / 2} color={SAMPLE_COLOUR} opacity={0.4}>
        <BlurMask blur={28} style="normal" />
      </Circle>
      {art && (
        <Image
          image={art}
          x={cx - DISC / 2}
          y={cy - DISC / 2}
          width={DISC}
          height={DISC}
          fit="cover"
        />
      )}
      <Circle cx={cx} cy={cy} r={DISC / 2}>
        <LinearGradient
          start={vec(cx - DISC / 2, cy - DISC / 2)}
          end={vec(cx + DISC / 2, cy + DISC / 2)}
          colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0)"]}
        />
      </Circle>
      <Circle
        cx={cx}
        cy={cy}
        r={RING}
        style="stroke"
        strokeWidth={3}
        color={colours.teal[700]}
      />
      <Path
        path={ring}
        style="stroke"
        strokeWidth={3}
        strokeCap="round"
        color={colours.teal[300]}
      />
      <Circle
        cx={cx + RING * Math.cos(knob)}
        cy={cy + RING * Math.sin(knob)}
        r={6}
        color={colours.teal[300]}
      />
    </Canvas>
  );
}

/** 4 · Private by design: a cool teal orb with a faint lock inside its bloom. */
export function LockedOrb({ width }: Props) {
  return (
    <View style={{ width, height: H }} className="items-center justify-center">
      <Canvas style={{ position: "absolute", width, height: H }}>
        <Orb
          cx={width / 2}
          cy={H / 2}
          size={112}
          core={colours.teal[300]}
          edge={colours.teal[700]}
          aura
        />
      </Canvas>
      <View style={{ opacity: 0.55 }}>
        <Lock color={colours.canvas} size={36} strokeWidth={1.5} />
      </View>
    </View>
  );
}
