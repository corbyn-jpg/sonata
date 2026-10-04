import { useState } from "react";
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Check, Plus } from "lucide-react-native";
import { addSong, createPlaylist, MAX_NAME_LENGTH, usePlaylists, type Playlist } from "@/lib/playlists";
import type { PlaylistSong } from "@/lib/playlistSongs";
import colours from "@/theme/colours";

type Props = {
  visible: boolean;
  /** The song to add, or null if there isn't one yet. */
  song: PlaylistSong | null;
  /** Called with a short confirmation (or what went wrong) once the sheet is done. */
  onDone: (message: string) => void;
  onClose: () => void;
};

const songCount = (n: number) => (n === 1 ? "1 song" : `${n} songs`);

/** Pick a playlist for the song, or start a new one with it. */
export function AddToPlaylistSheet({ visible, song, onDone, onClose }: Props) {
  const playlists = usePlaylists();
  const [naming, setNaming] = useState(false); // typing a new playlist's name
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setNaming(false);
    setName("");
    onClose();
  };

  // Already in this playlist? (Same week on the same instrument; adding it again updates it.)
  const holds = (playlist: Playlist) =>
    song !== null &&
    playlist.songs.some((s) => s.kind === song.kind && s.week === song.week && s.instrument === song.instrument);

  const run = async (task: (song: PlaylistSong) => Promise<unknown>, message: string) => {
    if (!song || busy) return;
    setBusy(true);
    try {
      await task(song);
      onDone(message);
    } catch (error) {
      console.warn("Couldn't add the song to a playlist:", error);
      onDone("That didn't work. Try again in a moment.");
    } finally {
      setBusy(false);
      close();
    }
  };

  const trimmed = name.trim();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {/* Tapping outside the sheet closes it */}
        <Pressable className="flex-1 justify-end bg-canvas/50" onPress={close} accessibilityLabel="Close">
          <Pressable
            onPress={() => {}}
            accessibilityViewIsModal
            className="gap-4 rounded-t-card border border-border bg-surface-raised px-6 pb-12 pt-6"
          >
            <Text className="font-mono-medium text-h4 text-primary">Add to a playlist</Text>

            <ScrollView className="max-h-[280px]" contentContainerClassName="gap-2">
              {playlists?.map((playlist) => {
                const added = holds(playlist);
                return (
                  <Pressable
                    key={playlist.id}
                    onPress={() =>
                      run(
                        (s) => addSong(playlist.id, s),
                        added ? `Updated in ${playlist.name}` : `Added to ${playlist.name}`,
                      )
                    }
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`${playlist.name}, ${songCount(playlist.songs.length)}${added ? ", already added" : ""}`}
                    className="min-h-[56px] flex-row items-center justify-between rounded-card border border-border bg-surface/60 px-4 py-2"
                  >
                    <View className="flex-1 gap-0.5">
                      <Text numberOfLines={1} className="font-sans-medium text-body text-primary">
                        {playlist.name}
                      </Text>
                      <Text className="font-sans text-caption text-muted">
                        {songCount(playlist.songs.length)}
                        {added ? " · already added" : ""}
                      </Text>
                    </View>
                    {added && <Check color={colours.violet[200]} size={18} strokeWidth={1.5} />}
                  </Pressable>
                );
              })}
            </ScrollView>

            {naming ? (
              <View className="gap-3">
                <TextInput
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  placeholder="Playlist name"
                  placeholderTextColor={colours.textMuted}
                  maxLength={MAX_NAME_LENGTH}
                  returnKeyType="done"
                  accessibilityLabel="New playlist name"
                  className="h-12 rounded-card border border-border bg-surface/60 px-4 font-sans text-body text-primary"
                />
                <Pressable
                  onPress={() => run((s) => createPlaylist(trimmed, s), `Added to ${trimmed}`)}
                  disabled={!trimmed || busy}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !trimmed || busy }}
                  className={`min-h-[52px] items-center justify-center rounded-pill bg-violet-700 ${!trimmed || busy ? "opacity-50" : ""}`}
                >
                  <Text className="font-sans-bold text-body text-primary">Create and add</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setNaming(true)}
                accessibilityRole="button"
                className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-pill border border-violet-500"
              >
                <Plus color={colours.violet[200]} size={18} strokeWidth={1.5} />
                <Text className="font-sans-medium text-body text-primary">New playlist</Text>
              </Pressable>
            )}

            <Pressable onPress={close} accessibilityRole="button" className="min-h-[44px] items-center justify-center">
              <Text className="font-sans-medium text-body text-secondary">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}