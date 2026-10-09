import type { Instrument } from "@/audio/instruments";
import type { Piece } from "@/engine";
import { sealedCollection, type Opened } from "@/lib/sealedCollection";

// Composer pieces, offline-first and encrypted like everything else the user makes (sealedCollection.ts). Firestore
// only sees who owns a piece and when it last changed.

export type PieceContent = {
  name: string;
  instrument: Instrument;
  piece: Piece;
};
export type SavedPiece = Opened<PieceContent>;

export const MAX_PIECE_NAME = 40;
const pieces = sealedCollection<PieceContent>("composer_pieces");

/** The name as it's saved: trimmed, at most 40 characters, never blank. */
export const pieceName = (name: string) =>
  name.trim().slice(0, MAX_PIECE_NAME) || "Untitled piece";

const clean = (content: PieceContent): PieceContent => ({
  ...content,
  name: pieceName(content.name),
});

/** Save a new piece. Returns its id. */
export const createPiece = (content: PieceContent) =>
  pieces.create(clean(content));

/** Save changes to a piece. */
export const updatePiece = (id: string, content: PieceContent) =>
  pieces.edit(id, () => clean(content));

export const deletePiece = pieces.remove;

/** Every piece, most recently changed first, kept up to date on any screen. Null until first loaded. */
export const usePieces = pieces.useAll;

/** Every piece on this phone (for Export my data and backups). */
export const getPieces = pieces.getAll;

/** Pieces from a backup file (skips any already here). Returns how many were added. */
export const restorePieces = (
  backup: readonly { content: PieceContent; updatedAt: number }[],
) =>
  pieces.restore(
    backup.map(({ content, updatedAt }) => ({
      content: clean(content),
      updatedAt,
    })),
  );
