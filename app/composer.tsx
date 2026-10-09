import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { Gauge, Layers, Play, Square } from "lucide-react-native";
import { preloadChords, previewNote, type Instrument } from "@/audio";
import { BackHeader } from "@/components/BackHeader";
import { Screen } from "@/components/Screen";
import type { Letter, Mode } from "@/data/notes";
import { isEmptyPiece, PIECE_STEPS, type Piece } from "@/engine";
import { NoteGrid } from "@/features/composer/NoteGrid";
import { TempoStepper } from "@/features/composer/TempoStepper";
import { usePiecePlayer } from "@/features/composer/usePiecePlayer";
import { InstrumentPicker } from "@/features/home/InstrumentPicker";
import { ModeToggle } from "@/features/home/ModeToggle";
import { SettingRow } from "@/features/settings/SettingRow";
import { feelNote } from "@/haptics";
import { usePreference } from "@/lib/preferences";
import colours from "@/theme/colours";

const EMPTY: (Letter | null)[] = Array(PIECE_STEPS).fill(null);

/**
 Custom Composer: a functional screen (flat, no washes, §6). The user writes a tune on the grid and hears it on their
 instrument, with the engine's harmony underneath if they want it. Saving pieces comes next.
 */
export default function Composer() {
  const feelNotes = usePreference("feelNotes");
  const startingInstrument = usePreference("instrument");
  const [instrument, setInstrument] = useState<Instrument>(startingInstrument);
  const [mode, setMode] = useState<Mode>("major");
  const [steps, setSteps] = useState(EMPTY);
  const [tempo, setTempo] = useState(96);
  const [harmony, setHarmony] = useState(true);
  const [cleared, setCleared] = useState<(Letter | null)[] | null>(null); // for Undo

  const piece: Piece = { mode, steps, tempo, harmony };
  const { play, stop, playing, making, failed, step } = usePiecePlayer(
    piece,
    instrument,
  );
  const empty = isEmptyPiece(piece);

  useEffect(() => preloadChords(instrument), [instrument]);

  // Undo is offered for 5 s after Clear, then the old tune is let go
  useEffect(() => {
    if (!cleared) return;
    const timer = setTimeout(() => setCleared(null), 5000);
    return () => clearTimeout(timer);
  }, [cleared]);

  const toggle = (at: number, letter: Letter) => {
    setCleared(null);
    const placing = steps[at] !== letter;
    setSteps(steps.map((s, i) => (i === at ? (placing ? letter : null) : s)));
    if (placing) {
      previewNote(letter, mode, instrument);
      if (feelNotes) feelNote(letter, mode);
    }
  };

  const clear = () => {
    if (cleared) {
      setSteps(cleared);
      setCleared(null);
    } else {
      setCleared(steps);
      setSteps(EMPTY);
    }
  };

  return (
    <Screen header={<BackHeader title="Composer" />}>
      <ScrollView
        contentContainerClassName="gap-6 pb-12"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-3">
          <View className="flex-row items-center justify-center gap-3">
            <ModeToggle mode={mode} onChange={setMode} />
            <InstrumentPicker
              instrument={instrument}
              onChange={setInstrument}
              title="Your piece sounds like"
            />
          </View>
          <Text className="font-sans text-caption text-secondary">
            Tap a square to place a note, and tap it again to take it away.
            Higher rows are higher notes.
          </Text>
        </View>

        <NoteGrid steps={steps} mode={mode} playing={step} onToggle={toggle} />

        <View>
          <SettingRow
            Icon={Gauge}
            title="Tempo"
            right={<TempoStepper tempo={tempo} onChange={setTempo} />}
          />
          <SettingRow
            Icon={Layers}
            title="Add harmony"
            detail="Chords and a bass line under your tune, from Sonata's model trained on Bach's chorales."
            right={
              <Switch
                value={harmony}
                onValueChange={setHarmony}
                accessibilityLabel="Add harmony"
                trackColor={{
                  false: colours.surfaceRaised,
                  true: colours.violet[700],
                }}
                thumbColor={colours.textPrimary}
              />
            }
          />
        </View>

        <View className="gap-2">
          <Pressable
            onPress={playing ? stop : play}
            disabled={empty || making}
            accessibilityRole="button"
            accessibilityState={{ disabled: empty || making, busy: making }}
            className={`min-h-[52px] flex-row items-center justify-center gap-2 rounded-pill bg-violet-700 active:opacity-80 ${empty ? "opacity-40" : ""}`}
          >
            {making ? (
              <ActivityIndicator color={colours.textPrimary} />
            ) : playing ? (
              <Square color={colours.textPrimary} size={18} strokeWidth={1.5} />
            ) : (
              <Play color={colours.textPrimary} size={18} strokeWidth={1.5} />
            )}
            <Text className="font-sans-bold text-body text-primary">
              {making ? "Getting it ready…" : playing ? "Stop" : "Play"}
            </Text>
          </Pressable>
          {failed && (
            <Text
              className="font-sans text-caption"
              style={{ color: colours.danger }}
              accessibilityLiveRegion="polite"
            >
              Couldn&apos;t play your piece. Please try again.
            </Text>
          )}
          <Pressable
            onPress={clear}
            disabled={empty && !cleared}
            accessibilityRole="button"
            className={`min-h-[44px] items-center justify-center ${empty && !cleared ? "opacity-40" : ""}`}
          >
            <Text className="font-sans-medium text-body text-secondary">
              {cleared ? "Undo clear" : "Clear"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
