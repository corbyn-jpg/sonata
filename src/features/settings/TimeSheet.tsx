import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Canvas, LinearGradient, Rect, vec } from "@shopify/react-native-skia";
import colours from "@/theme/colours";
import { TimeWheel, WHEEL_ROW, WHEEL_ROWS } from "./TimeWheel";

const HEIGHT = WHEEL_ROW * WHEEL_ROWS;
const FADE = WHEEL_ROW * Math.floor(WHEEL_ROWS / 2); // everything above and below the chosen row

type Props = {
  /** The current time, in minutes after midnight. */
  minutes: number;
  onDone: (minutes: number) => void;
  onClose: () => void;
};

/** The rows above and below the chosen one fade into the sheet, so the eye lands on the middle. */
function Fades({ width }: { width: number }) {
  const solid = colours.surfaceRaised;
  const clear = `${colours.surfaceRaised}00`;
  return (
    <Canvas
      style={{ position: "absolute", width, height: HEIGHT }}
      pointerEvents="none"
    >
      <Rect x={0} y={0} width={width} height={FADE}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, FADE)}
          colors={[solid, clear]}
        />
      </Rect>
      <Rect x={0} y={HEIGHT - FADE} width={width} height={FADE}>
        <LinearGradient
          start={vec(0, HEIGHT - FADE)}
          end={vec(0, HEIGHT)}
          colors={[clear, solid]}
        />
      </Rect>
    </Canvas>
  );
}

/**
 Pick the reminder time on two wheels, hours and minutes, like a phone's alarm clock. Mount it only while it's open, so it starts from the current time each time.
 */
export function TimeSheet({ minutes, onDone, onClose }: Props) {
  const [hour, setHour] = useState(Math.floor(minutes / 60));
  const [minute, setMinute] = useState(minutes % 60);
  const [width, setWidth] = useState(0);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* Tapping outside the sheet closes it */}
      <Pressable
        className="flex-1 justify-end bg-canvas/70"
        onPress={onClose}
        accessibilityLabel="Close"
      >
        <Pressable
          onPress={() => {}}
          className="gap-6 rounded-t-card border border-border bg-surface-raised px-6 pb-12 pt-6"
        >
          <Text
            className="font-mono-medium text-h4 text-primary"
            accessibilityRole="header"
          >
            Remind me at
          </Text>

          <View
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            className="flex-row items-center justify-center"
            style={{ height: HEIGHT }}
          >
            {/* The band the chosen time sits on */}
            <View
              className="absolute left-0 right-0 rounded-card bg-surface"
              style={{ top: FADE, height: WHEEL_ROW }}
              pointerEvents="none"
            />
            <TimeWheel
              count={24}
              value={hour}
              onChange={setHour}
              label="Hour"
              unit="hours"
            />
            <Text
              className="font-mono-medium text-h2 text-primary"
              importantForAccessibility="no"
            >
              :
            </Text>
            <TimeWheel
              count={60}
              value={minute}
              onChange={setMinute}
              label="Minute"
              unit="minutes"
            />
            {width > 0 && <Fades width={width} />}
          </View>

          <Pressable
            onPress={() => onDone(hour * 60 + minute)}
            accessibilityRole="button"
            className="min-h-[52px] items-center justify-center rounded-pill bg-violet-700 active:opacity-80"
          >
            <Text className="font-sans-bold text-body text-primary">
              Set time
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
