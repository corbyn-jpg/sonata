import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, ChevronRight, ListMusic, Plus } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { createPlaylist, MAX_NAME_LENGTH, usePlaylists } from "@/lib/playlists";
import colours from "@/theme/colours";

const songCount = (n: number) => (n === 1 ? "1 song" : `${n} songs`);

/** Every playlist, and a way to start a new one. */
export default function Playlists() {
  const playlists = usePlaylists();
  const [naming, setNaming] = useState(false); // typing a new playlist's name
  const [name, setName] = useState("");
  const trimmed = name.trim();

  const create = async () => {
    const id = await createPlaylist(trimmed);
    setNaming(false);
    setName("");
    router.push({ pathname: "/playlists/[id]", params: { id } });
  };

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
      <Text className="font-mono-medium text-h3 text-primary">Your playlists</Text>
    </View>
  );

  return (
    <Screen header={header}>
      {playlists === null ? (
        <ActivityIndicator color={colours.violet[200]} />
      ) : (
        <ScrollView contentContainerClassName="gap-2 pb-8" showsVerticalScrollIndicator={false}>
          {playlists.length === 0 && !naming && (
            <Text className="mb-4 text-center font-sans text-body text-secondary">
              No playlists yet. Add a week&apos;s song with the Playlist button on the Weekly tab, or start one here.
            </Text>
          )}

          {playlists.map((playlist) => (
            <Pressable
              key={playlist.id}
              onPress={() => router.push({ pathname: "/playlists/[id]", params: { id: playlist.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${playlist.name}, ${songCount(playlist.songs.length)}`}
              className="min-h-[64px] flex-row items-center gap-3 rounded-card border border-border bg-surface/60 px-4 py-2"
            >
              <View className="h-10 w-10 items-center justify-center rounded-pill bg-violet-700/40">
                <ListMusic color={colours.violet[200]} size={20} strokeWidth={1.5} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text numberOfLines={1} className="font-sans-medium text-body text-primary">
                  {playlist.name}
                </Text>
                <Text className="font-sans text-caption text-muted">{songCount(playlist.songs.length)}</Text>
              </View>
              <ChevronRight color={colours.textMuted} size={20} strokeWidth={1.5} />
            </Pressable>
          ))}

          {naming ? (
            <View className="mt-2 gap-3">
              <TextInput
                value={name}
                onChangeText={setName}
                autoFocus
                placeholder="Playlist name"
                placeholderTextColor={colours.textMuted}
                maxLength={MAX_NAME_LENGTH}
                returnKeyType="done"
                onSubmitEditing={() => trimmed && create()}
                accessibilityLabel="New playlist name"
                className="h-12 rounded-card border border-border bg-surface/60 px-4 font-sans text-body text-primary"
              />
              <Pressable
                onPress={create}
                disabled={!trimmed}
                accessibilityRole="button"
                accessibilityState={{ disabled: !trimmed }}
                className={`min-h-[52px] items-center justify-center rounded-pill bg-violet-700 ${trimmed ? "" : "opacity-50"}`}
              >
                <Text className="font-sans-bold text-body text-primary">Create</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setNaming(true)}
              accessibilityRole="button"
              className="mt-2 min-h-[52px] flex-row items-center justify-center gap-2 rounded-pill border border-violet-500"
            >
              <Plus color={colours.violet[200]} size={18} strokeWidth={1.5} />
              <Text className="font-sans-medium text-body text-primary">New playlist</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}