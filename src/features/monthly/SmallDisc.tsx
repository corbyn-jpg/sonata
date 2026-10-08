import { useEffect, useMemo } from "react";
import {
  Canvas,
  Circle,
  Group,
  Image,
  Skia,
  vec,
  type SkImage,
} from "@shopify/react-native-skia";
import {
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";
import colours from "@/theme/colours";

const SPIN = (2 * Math.PI) / 40; // the same speed as the Weekly disc: one turn every 40 s

type Props = {
  art: SkImage | null;
  size: number;
  /** Ringed when it's the record that's loaded. */
  active: boolean;
  /** Turns while playing (unless Reduce Motion is on). */
  spinning: boolean;
};

/** A small record: its art, turning while it plays, with a ring when it's the one loaded. */
export function SmallDisc({ art, size, active, spinning }: Props) {
  const reduceMotion = useReducedMotion();
  const angle = useSharedValue(0);
  const frame = useFrameCallback((info) => {
    const dt = (info.timeSincePreviousFrame ?? 16) / 1000;
    angle.set((angle.get() + SPIN * dt) % (2 * Math.PI));
  }, false);
  useEffect(() => {
    frame.setActive(spinning && !reduceMotion); // with Reduce Motion on, it stays still
  }, [spinning, reduceMotion, frame]);
  const rotation = useDerivedValue(() => [{ rotate: angle.get() }]);
  const c = size / 2;
  const clip = useMemo(() => Skia.Path.Circle(c, c, c), [c]);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group clip={clip} origin={vec(c, c)} transform={rotation}>
        {art && (
          <Image
            image={art}
            x={0}
            y={0}
            width={size}
            height={size}
            fit="cover"
          />
        )}
      </Group>
      {active && (
        <Circle
          cx={c}
          cy={c}
          r={c - 1}
          style="stroke"
          strokeWidth={2}
          color={colours.violet[200]}
        />
      )}
    </Canvas>
  );
}
