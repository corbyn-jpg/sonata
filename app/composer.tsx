import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { router, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import {
  Check,
  FileMusic,
  FolderOpen,
  Gauge,
  Layers,
  ListPlus,
  Play,
  Save,
  Square,
  type LucideIcon,
} from "lucide-react-native";
import { preloadChords, previewNote, type Instrument } from "@/audio";
import { BackHeader } from "@/components/BackHeader";
import { Screen } from "@/components/Screen";
import type { Letter, Mode } from "@/data/notes";
import { isEmptyPiece, PIECE_STEPS, type Piece } from "@/engine";
import { NameSheet } from "@/features/composer/NameSheet";
import { NoteGrid } from "@/features/composer/NoteGrid";
import { PiecesSheet } from "@/features/composer/PiecesSheet";
import { TempoStepper } from "@/features/composer/TempoStepper";
import { usePiecePlayer } from "@/features/composer/usePiecePlayer";
import { InstrumentPicker } from "@/features/home/InstrumentPicker";
import { ModeToggle } from "@/features/home/ModeToggle";
import { AddToPlaylistSheet } from "@/features/playlists/AddToPlaylistSheet";
import { SettingRow } from "@/features/settings/SettingRow";
import { feelNote } from "@/haptics";
import {
  createPiece,
  deletePiece,
  pieceName,
  updatePiece,
  usePieces,
  type PieceContent,
  type SavedPiece,
} from "@/lib/pieces";
import type { PlaylistSong } from "@/lib/playlistSongs";
import { usePreference } from "@/lib/preferences";
import colours from "@/theme/colours";

const EMPTY: (Letter | null)[] = Array(PIECE_STEPS).fill(null);
const NEW_PIECE: Omit<Piece, "steps"> = {
  mode: "major",
  tempo: 96,
  harmony: true,
};

/** What's saved, as text, to tell whether anything has changed since (field order fixed). */
const snapshotOf = ({ name, instrument, piece }: PieceContent) =>
  JSON.stringify([
    name,
    instrument,
    piece.mode,
    piece.steps,
    piece.tempo,
    piece.harmony,
  ]);

/**
 Custom Composer: a functional screen (flat, no washes, §6). The user writes a tune on the grid and hears it on their
 instrument, with the engine's harmony underneath if they want it, then saves it to their pieces or a playlist.
 */
export default function Composer() {
  const feelNotes = usePreference("feelNotes");
  const startingInstrument = usePreference("instrument");
  const pieces = usePieces();

  const [instrument, setInstrument] = useState<Instrument>(startingInstrument);
  const [mode, setMode] = useState<Mode>(NEW_PIECE.mode);
  const [steps, setSteps] = useState(EMPTY);
  const [tempo, setTempo] = useState(NEW_PIECE.tempo);
  const [harmony, setHarmony] = useState(NEW_PIECE.harmony);
  const [cleared, setCleared] = useState<(Letter | null)[] | null>(null); // for Undo

  // The saved piece being edited (null for a new one), and what it looked like when last saved
  const [savedId, setSavedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [snapshot, setSnapshot] = useState<string | null>(null);

  const [browsing, setBrowsing] = useState(false); // Your pieces is open
  const [naming, setNaming] = useState(false); // the first save asks for a name
  const [choosing, setChoosing] = useState(false); // the playlist sheet is open
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const piece: Piece = { mode, steps, tempo, harmony };
  const content: PieceContent = { name, instrument, piece };
  const empty = isEmptyPiece(piece);
  const changed = savedId === null ? !empty : snapshotOf(content) !== snapshot;
  const { play, stop, playing, making, failed, step } = usePiecePlayer(
    piece,
    instrument,
  );

  // A copy for playlists: only of what's saved, so a playlist never holds a version that isn't in Your pieces
  const playlistSong: PlaylistSong | null =
    savedId && !changed
      ? { kind: "piece", id: savedId, name, instrument, piece }
      : null;

  useEffect(() => preloadChords(instrument), [instrument]);

  // Undo is offered for 5 s after Clear, then the old tune is let go
  useEffect(() => {
    if (!cleared) return;
    const timer = setTimeout(() => setCleared(null), 5000);
    return () => clearTimeout(timer);
  }, [cleared]);

  // A confirmation shows for a few seconds, then goes
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  /** Ask before unsaved changes are lost; `then` runs if the user lets them go. */
  const confirmLeaving = (then: () => void) =>
    Alert.alert("Leave this piece?", "Your changes haven't been saved.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard changes", style: "destructive", onPress: then },
    ]);

  // Going back with unsaved changes asks first, too
  const navigation = useNavigation();
  usePreventRemove(changed, ({ data }) =>
    confirmLeaving(() => navigation.dispatch(data.action)),
  );

  /** Show a saved piece in the grid, or an empty one (null). */
  const load = (saved: SavedPiece | null) => {
    stop();
    setCleared(null);
    setSavedId(saved?.id ?? null);
    setName(saved?.name ?? "");
    setInstrument(saved?.instrument ?? startingInstrument);
    setMode(saved?.piece.mode ?? NEW_PIECE.mode);
    setSteps(saved ? [...saved.piece.steps] : EMPTY);
    setTempo(saved?.piece.tempo ?? NEW_PIECE.tempo);
    setHarmony(saved?.piece.harmony ?? NEW_PIECE.harmony);
    setSnapshot(saved ? snapshotOf(saved) : null);
  };

  const switchTo = (saved: SavedPiece | null) => {
    setBrowsing(false);
    if (changed) confirmLeaving(() => load(saved));
    else load(saved);
  };

  const confirmDelete = (saved: SavedPiece) =>
    Alert.alert(
      `Delete "${saved.name}"?`,
      "This can't be undone. Playlists that include it keep their copy.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deletePiece(saved.id);
            if (saved.id === savedId) {
              setSavedId(null); // the notes stay on the grid, as a new, unsaved piece
              setSnapshot(null);
            }
          },
        },
      ],
    );

  /** Save changes straight away, or ask for a name the first time. */
  const save = async () => {
    if (busy) return;
    if (savedId === null) return setNaming(true);
    setBusy(true);
    try {
      await updatePiece(savedId, content);
      setSnapshot(snapshotOf(content));
    } catch (error) {
      console.warn(
        "Couldn't save the piece:",
        error instanceof Error ? error.message : error,
      );
      setMessage("Couldn't save your piece. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const saveNew = async (typed: string) => {
    setNaming(false);
    setBusy(true);
    const named = { ...content, name: pieceName(typed) };
    try {
      setSavedId(await createPiece(named));
      setName(named.name);
      setSnapshot(snapshotOf(named));
    } catch (error) {
      console.warn(
        "Couldn't save the piece:",
        error instanceof Error ? error.message : error,
      );
      setMessage("Couldn't save your piece. Please try again.");
    } finally {
      setBusy(false);
    }
  };

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

  const saved = savedId !== null && !changed;
  const action = (
    label: string,
    Icon: LucideIcon,
    onPress: () => void,
    disabled: boolean,
    hint?: string,
  ) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      className={`h-11 flex-row items-center gap-2 rounded-pill border border-border bg-surface/60 px-4 active:opacity-80 ${disabled ? "opacity-50" : ""}`}
    >
      <Icon color={colours.textSecondary} size={16} strokeWidth={1.5} />
      <Text className="font-sans-medium text-caption text-secondary">
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Screen
      header={
        <BackHeader
          title={savedId ? name : "Composer"}
          right={
            <Pressable
              onPress={() => setBrowsing(true)}
              accessibilityRole="button"
              accessibilityLabel="Your pieces"
              className="-mr-2.5 h-11 w-11 items-center justify-center active:opacity-60"
            >
              <FolderOpen
                color={colours.textSecondary}
                size={24}
                strokeWidth={1.5}
              />
            </Pressable>
          }
        />
      }
    >
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

        <View className="gap-3">
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

          <View className="flex-row flex-wrap justify-center gap-2">
            {/* Saving shows itself: the button turns into "Saved" */}
            {action(
              saved ? "Saved" : "Save",
              saved ? Check : Save,
              () => void save(),
              saved || empty || busy,
            )}
            {action(
              "Playlist",
              ListPlus,
              () => setChoosing(true),
              !playlistSong,
              playlistSong ? undefined : "Save the piece first",
            )}
            {action(
              "Sheet music",
              FileMusic,
              () =>
                savedId &&
                router.push({
                  pathname: "/sheet-music",
                  params: { piece: savedId },
                }),
              !saved,
              saved ? undefined : "Save the piece first",
            )}
          </View>
          {message && (
            <Text
              accessibilityLiveRegion="polite"
              className="text-center font-sans text-caption text-muted"
            >
              {message}
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

      <PiecesSheet
        visible={browsing}
        pieces={pieces}
        currentId={savedId}
        onOpen={switchTo}
        onNew={() => switchTo(null)}
        onDelete={(p) => {
          setBrowsing(false);
          confirmDelete(p);
        }}
        onClose={() => setBrowsing(false)}
      />
      {naming && (
        <NameSheet
          suggestion={`Piece ${(pieces?.length ?? 0) + 1}`}
          onSave={(typed) => void saveNew(typed)}
          onClose={() => setNaming(false)}
        />
      )}
      <AddToPlaylistSheet
        visible={choosing}
        song={playlistSong}
        onDone={setMessage}
        onClose={() => setChoosing(false)}
      />
    </Screen>
  );
}
