import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Plus, Trash2 } from "lucide-react-native";
import { INSTRUMENT_LABELS } from "@/audio";
import { BottomSheet } from "@/components/BottomSheet";
import type { SavedPiece } from "@/lib/pieces";
import colours from "@/theme/colours";

type Props = {
  visible: boolean;
  /** Null while they're still loading. */
  pieces: readonly SavedPiece[] | null;
  /** The piece that's open in the Composer, if it's been saved. */
  currentId: string | null;
  onOpen: (piece: SavedPiece) => void;
  onNew: () => void;
  onDelete: (piece: SavedPiece) => void;
  onClose: () => void;
};

const notes = (piece: SavedPiece) => {
  const n = piece.piece.steps.filter(Boolean).length;
  return n === 1 ? "1 note" : `${n} notes`;
};

/** Every saved piece, most recently changed first: open one, start a new one, or delete one. */
export function PiecesSheet({
  visible,
  pieces,
  currentId,
  onOpen,
  onNew,
  onDelete,
  onClose,
}: Props) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      className="max-h-[80%] gap-3 px-5 pt-5"
    >
      <Text
        className="px-1 font-mono-medium text-h4 text-primary"
        accessibilityRole="header"
      >
        Your pieces
      </Text>
      <Pressable
        onPress={onNew}
        accessibilityRole="button"
        className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-pill border border-violet-500 active:opacity-80"
      >
        <Plus color={colours.violet[200]} size={18} strokeWidth={1.5} />
        <Text className="font-sans-medium text-body text-primary">
          New piece
        </Text>
      </Pressable>

      {pieces === null ? (
        <ActivityIndicator color={colours.violet[200]} />
      ) : pieces.length === 0 ? (
        <Text className="px-1 py-4 font-sans text-body text-secondary">
          Nothing saved yet. Save a piece and it will be here.
        </Text>
      ) : (
        <ScrollView contentContainerClassName="gap-1">
          {pieces.map((piece) => {
            const open = piece.id === currentId;
            return (
              <View
                key={piece.id}
                className={`min-h-[60px] flex-row items-center rounded-card ${open ? "bg-violet-700/40" : ""}`}
              >
                <Pressable
                  onPress={() => onOpen(piece)}
                  accessibilityRole="button"
                  accessibilityLabel={`${piece.name}, ${INSTRUMENT_LABELS[piece.instrument]}, ${notes(piece)}${open ? ", open now" : ""}`}
                  className="flex-1 gap-0.5 px-3 py-2"
                >
                  <Text
                    numberOfLines={1}
                    className="font-sans-medium text-body text-primary"
                  >
                    {piece.name}
                  </Text>
                  <Text className="font-sans text-caption text-muted">
                    {piece.piece.mode === "major" ? "Major" : "Minor"} ·{" "}
                    {INSTRUMENT_LABELS[piece.instrument]} · {notes(piece)}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onDelete(piece)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${piece.name}`}
                  className="h-11 w-11 items-center justify-center active:opacity-60"
                >
                  <Trash2
                    color={colours.textMuted}
                    size={18}
                    strokeWidth={1.5}
                  />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </BottomSheet>
  );
}
