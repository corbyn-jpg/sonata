import { useState, type ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import {
  Canvas,
  Circle,
  RadialGradient,
  vec,
} from "@shopify/react-native-skia";

type Props = ViewProps & {
  /** Corner glow colours (inner, outer), only for cards whose colours mean something, like a song's palette. */
  glow?: [string, string];
  /** Extra classes, e.g. a fixed height or flex-1 for half-width cards. */
  className?: string;
  children: ReactNode;
};

const GLOW = 150; // radius of the corner glow

/** A bento card: a dark surface, with an optional two-tone glow rising from its top-right corner. */
export function BentoCard({ glow, className = "", children, ...rest }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View
      {...rest}
      onLayout={glow ? (e) => setSize(e.nativeEvent.layout) : undefined}
      className={`overflow-hidden rounded-card border border-border bg-surface/70 p-4 ${className}`}
    >
      {glow && size.width > 0 && (
        <Canvas
          style={{
            position: "absolute",
            width: size.width,
            height: size.height,
          }}
          pointerEvents="none"
        >
          <Circle cx={size.width} cy={0} r={GLOW}>
            <RadialGradient
              c={vec(size.width, 0)}
              r={GLOW}
              colors={[`${glow[0]}59`, `${glow[1]}26`, `${glow[1]}00`]}
              positions={[0, 0.5, 1]}
            />
          </Circle>
        </Canvas>
      )}
      {children}
    </View>
  );
}
