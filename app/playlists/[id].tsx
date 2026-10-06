import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Pause, Pencil, Play } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { composeWeek } from "@/engine";
import { PlaylistSongRow } from "@/features/playlists/PlaylistSongRow";
import { usePlaylistPlayer } from "@/features/playlists/usePlaylistPlayer";
import { deletePlaylist, MAX_NAME_LENGTH, removeSong, renamePlaylist, usePlaylists } from "@/lib/playlists";
import colours from "@/theme/colours";

/** One playlist: play it through, rename it, remove songs, or delete it. */
export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playlists = usePlaylists();
  const playlist = playlists?.find((p) => p.id === id) ?? null;

  // Each song is composed again from its saved notes: the same notes always make the same song
  const songs = useMemo(() => playlist?.songs ?? [], [playlist]);
  const compositions = useMemo(() => songs.map((song) => composeWeek(song.days, song.week)), [songs]);
  const { current, playing, loading, toggle, playAll, stop } = usePlaylistPlayer(songs, compositions);

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");

  const startRenaming = () => {
    setName(playlist?.name ?? "");
    setRenaming(true);
  };
  const finishRenaming = () => {
    setRenaming(false);
    if (name.trim() && name.trim() !== playlist?.name) void renamePlaylist(id, name);
  };

  const confirmRemove = (index: number) =>
    Alert.alert("Remove this song?", "It's only taken out of this playlist.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          stop(); // the songs are about to move up one
          void removeSong(id, index);
        },
      },
    ]);

  const confirmDelete = () =>
    Alert.alert("Delete this playlist?", "Your weeks and their songs aren't affected.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          stop();
          await deletePlaylist(id);
          router.back();
        },
      },
    ]);

  const header = (
    <View className="mb-6 flex-row items-center gap-2">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back"
        className="-ml-3 h-11 w-11 items-center justify-center"
      >
        <ChevronLeft color={colours.textSecondary} size={24} strokeWidth={1.5} />
      </Pressable>
      {renaming ? (
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={finishRenaming}
          onSubmitEditing={finishRenaming}
          autoFocus
          maxLength={MAX_NAME_LENGTH}
          returnKeyType="done"
          accessibilityLabel="Playlist name"
          className="h-12 flex-1 rounded-card border border-border bg-surface/60 px-4 font-mono-medium text-h4 text-primary"
        />
      ) : (
        <Pressable
          onPress={startRenaming}
          disabled={!playlist}
          accessibilityRole="button"
          accessibilityLabel={`${playlist?.name ?? "Playlist"}, rename`}
          className="flex-1 flex-row items-center gap-2"
        >
          <Text numberOfLines={1} className="shrink font-mono-medium text-h3 text-primary">
            {playlist?.name ?? "Playlist"}
          </Text>
          {playlist && <Pencil color={colours.textMuted} size={16} strokeWidth={1.5} />}
        </Pressable>
      )}
    </View>
  );

  if (playlists === null) {
    return (
      <Screen header={header}>
        <ActivityIndicator color={colours.violet[200]} />
      </Screen>
    );
  }

  if (!playlist) {
    return (
      <Screen header={header}>
        <Text className="text-center font-sans text-body text-secondary">This playlist has been deleted.</Text>
      </Screen>
    );
  }

  const going = current !== null && playing;
  return (
    <Screen header={header}>
      <ScrollView contentContainerClassName="gap-2 pb-8" showsVerticalScrollIndicator={false}>
        {songs.length === 0 ? (
          <Text className="text-center font-sans text-body text-secondary">
            No songs yet. Add one with the Playlist button on the Weekly tab.
          </Text>
        ) : (
          <Pressable
            onPress={playAll}
            accessibilityRole="button"
            className="mb-2 min-h-[52px] flex-row items-center justify-center gap-2 rounded-pill bg-violet-700"
          >
            {going ? (
              <Pause color={colours.textPrimary} fill={colours.textPrimary} size={18} strokeWidth={1.5} />
            ) : (
              <Play color={colours.textPrimary} fill={colours.textPrimary} size={18} strokeWidth={1.5} />
            )}
            <Text className="font-sans-bold text-body text-primary">
              {going ? "Pause" : current === null ? "Play all" : "Play"}
            </Text>
          </Pressable>
        )}

        {songs.map((song, index) => (
          <PlaylistSongRow
            key={`${song.week}-${song.instrument}`}
            song={song}
            composition={compositions[index]}
            active={index === current}
            playing={playing}
            loading={loading}
            onToggle={() => toggle(index)}
            onRemove={() => confirmRemove(index)}
          />
        ))}

        <Pressable
          onPress={confirmDelete}
          accessibilityRole="button"
          className="mt-6 min-h-[44px] items-center justify-center"
        >
          <Text className="font-sans-medium text-body text-muted">Delete playlist</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}