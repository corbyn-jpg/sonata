import {
  BlurMask,
  Group,
  interpolateColors,
  Line,
  mixColors,
  Morphology,
  Oval,
  Path,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import {
  Extrapolation,
  interpolate,
  useDerivedValue,
  type SharedValue,
} from "react-native-reanimated";
import { LETTERS, pitchOf } from "@/data/notes";
import colours from "@/theme/colours";

// Clef and flat shapes from Material Design Icons (Apache 2.0), drawn in a 24×24 box
const CLEF = Skia.Path.MakeFromSVGString(
  "M13 11V7.5L15.2 5.29C16 4.5 16.15 3.24 15.59 2.26C15.14 1.47 14.32 1 13.45 1C13.24 1 13 1.03 12.81 1.09C11.73 1.38 11 2.38 11 3.5V6.74L7.86 9.91C6.2 11.6 5.7 14.13 6.61 16.34C7.38 18.24 9.06 19.55 11 19.89V20.5C11 20.76 10.77 21 10.5 21H9V23H10.5C11.85 23 13 21.89 13 20.5V20C15.03 20 17.16 18.08 17.16 15.25C17.16 12.95 15.24 11 13 11M13 3.5C13 3.27 13.11 3.09 13.32 3.03C13.54 2.97 13.77 3.06 13.88 3.26C14 3.46 13.96 3.71 13.8 3.87L13 4.73V3.5M11 11.5C10.03 12.14 9.3 13.24 9.04 14.26L11 14.78V17.83C9.87 17.53 8.9 16.71 8.43 15.57C7.84 14.11 8.16 12.45 9.26 11.33L11 9.5V11.5M13 18V12.94C14.17 12.94 15.18 14.04 15.18 15.25C15.18 17 13.91 18 13 18Z",
)!;
const FLAT = Skia.Path.MakeFromSVGString(
  "M8.5 19C13.36 16.26 15.5 13.91 15.5 12C15.5 10.59 14.79 9 12.5 9C11.8 9 11.11 9.28 10.5 9.67V5H8.5M10.5 15.38V12.26C11.12 11.59 11.95 11 12.5 11C13.09 11 13.5 11.07 13.5 12C13.5 12.15 13.4 13.3 10.5 15.38Z",
)!;

const GAP = 8; // space between staff lines
const WIDTH = 150;
const HEAD_RX = GAP * 0.68;
const HEAD_RY = GAP * 0.5;
const STEM = GAP * 3.5;
const INDICES = LETTERS.map((_, i) => i);
// Staff steps above the bottom line (E4): C4 sits on a ledger line below, B4 on the middle line
const STEPS = [-2, -1, 0, 1, 2, 3, 4];
const MAJOR_CORES = LETTERS.map((l) => colours.orb[l].major.core);
const MINOR_CORES = LETTERS.map((l) => colours.orb[l].minor.core);
// 1 where the Dark page lowers the note (E♭, A♭, B♭)
const MINOR_FLATS = LETTERS.map((l) =>
  pitchOf(l, "minor").endsWith("b") ? 1 : 0,
);

type Props = {
  cx: number;
  /** y of the top staff line */
  top: number;
  /** 0 = Bright, 1 = Dark — animated, so colours and flats crossfade */
  page: SharedValue<number>;
  /** Carousel position, so the note glides between pitches as you swipe */
  position: SharedValue<number>;
};

/** A treble staff showing the centred orb's note. Draw inside a Skia <Canvas>. */
export function NoteStaff({ cx, top, page, position }: Props) {
  const left = cx - WIDTH / 2;
  const bottom = top + GAP * 4;
  const noteX = left + WIDTH * 0.62;

  const step = useDerivedValue(() =>
    interpolate(position.value, INDICES, STEPS, Extrapolation.CLAMP),
  );
  const noteY = useDerivedValue(() => bottom - (step.value * GAP) / 2);
  // Lifted towards off-white so the darker Dark-page colours stay readable on the night sky
  // Lifted towards off-white so the darker Dark-page colours stay readable on the night sky
  const colour = useDerivedValue(() =>
    mixColors(
      0.3,
      mixColors(
        page.value,
        interpolateColors(position.value, INDICES, MAJOR_CORES),
        interpolateColors(position.value, INDICES, MINOR_CORES),
      ),
      colours.textPrimary,
    ),
  );

  const head = useDerivedValue(() => [
    { translateX: noteX },
    { translateY: noteY.value },
    { rotate: -0.35 },
  ]);
  // Below the middle line the stem goes up on the right; from the middle line, down on the left
  const stemTop = useDerivedValue(() =>
    step.value < 3.5
      ? vec(noteX + HEAD_RX - 0.8, noteY.value)
      : vec(noteX - HEAD_RX + 0.8, noteY.value),
  );
  const stemEnd = useDerivedValue(() =>
    step.value < 3.5
      ? vec(noteX + HEAD_RX - 0.8, noteY.value - STEM)
      : vec(noteX - HEAD_RX + 0.8, noteY.value + STEM),
  );

  const flatOpacity = useDerivedValue(
    () =>
      interpolate(position.value, INDICES, MINOR_FLATS, Extrapolation.CLAMP) *
      page.value,
  );
  const flatScale = (GAP * 2.5) / 14; // the flat is 14 units tall in its box
  const flat = useDerivedValue(() => [
    { translateX: noteX - HEAD_RX - 3 - 15.5 * flatScale },
    { translateY: noteY.value - 12.5 * flatScale }, // bowl centred on the note
    { scale: flatScale },
  ]);

  const ledgerOpacity = useDerivedValue(() =>
    interpolate(position.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  );

  const clefScale = (GAP * 6.5) / 22; // clef spans about 6½ gaps
  const clef = [
    { translateX: left - 6 * clefScale },
    { translateY: bottom - GAP - 15 * clefScale }, // curl wraps the G line
    { scale: clefScale },
  ];

  return (
    <Group>
      {[0, 1, 2, 3, 4].map((i) => (
        <Line
          key={i}
          p1={vec(left, top + i * GAP)}
          p2={vec(left + WIDTH, top + i * GAP)}
          color={colours.violet[200]}
          opacity={0.3}
          strokeWidth={1}
        />
      ))}
      <Group transform={clef} opacity={0.75}>
        <Path path={CLEF} color={colours.textSecondary} />
        <Morphology operator="erode" radius={0.35} />
      </Group>

      <Line
        p1={vec(noteX - HEAD_RX - 4, bottom + GAP)}
        p2={vec(noteX + HEAD_RX + 4, bottom + GAP)}
        color={colours.violet[200]}
        opacity={ledgerOpacity}
        strokeWidth={1}
      />
      <Group transform={flat} opacity={flatOpacity}>
        <Path path={FLAT} color={colour} />
      </Group>
      <Line p1={stemTop} p2={stemEnd} color={colour} strokeWidth={1.5} />
      <Group transform={head}>
        <Oval
          x={-HEAD_RX * 1.6}
          y={-HEAD_RY * 1.6}
          width={HEAD_RX * 3.2}
          height={HEAD_RY * 3.2}
          color={colour}
          opacity={0.5}
        >
          <BlurMask blur={4} style="normal" />
        </Oval>
        <Oval
          x={-HEAD_RX}
          y={-HEAD_RY}
          width={HEAD_RX * 2}
          height={HEAD_RY * 2}
          color={colour}
        />
      </Group>
    </Group>
  );
}
