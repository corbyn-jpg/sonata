import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Download, ListPlus, Share2 } from "lucide-react-native";
import { AddToPlaylistSheet } from "@/features/playlists/AddToPlaylistSheet";
import type { PlaylistSong } from "@/lib/playlistSongs";
import colours from "@/theme/colours";
import { saveSong, shareSong } from "./shareSong";
import { ShareSheet } from "./ShareSheet";

type Props = {
  /** The rendered song, or null while it's still being made. */
  uri: string | null;
  /** What the file is called once it leaves the app. */
  fileName: string;
  /** The week's song as a playlist entry, or null when it can't be added (e.g. an example week). */
  playlistSong: PlaylistSong | null;
};

/** Share the week's song, save it to the phone, or add it to a playlist. */
export function SongActions({ uri, fileName, playlistSong }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [writing, setWriting] = useState(false); // the "add a message" sheet is open
  const [choosing, setChoosing] = useState(false); // the playlist sheet is open

  // A confirmation shows for a few seconds, then fades from the layout
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const run = async (action: (uri: string) => Promise<string | null>) => {
    if (!uri || busy) return;
    setBusy(true);
    try {
      setMessage(await action(uri));
    } catch (error) {
      console.warn("Couldn't share or save the song:", error);
      setMessage("That didn't work. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const buttons = [
    {
      label: "Share",
      Icon: Share2,
      onPress: () => setWriting(true), // first, the chance to add a message
    },
    // iPhone's share sheet has "Save to Files", so a separate Save is only needed on Android
    ...(Platform.OS === "android"
      ? [
          {
            label: "Save",
            Icon: Download,
            onPress: () =>
              run(async (song) =>
                (await saveSong(song, fileName)) ? "Saved to your phone" : null,
              ),
          },
        ]
      : []),
    ...(playlistSong
      ? [
          {
            label: "Playlist",
            Icon: ListPlus,
            onPress: () => setChoosing(true),
          },
        ]
      : []),
  ];

  const share = (caption: string) => {
    setWriting(false);
    run(async (song) => {
      // Let our sheet slide away first: iPhone can't open its share sheet on top of another one
      await new Promise((resolve) => setTimeout(resolve, 350));
      await shareSong(song, fileName, caption);
      return null; // the share sheet is its own confirmation
    });
  };

  const disabled = !uri || busy;
  return (
    <View className="items-center gap-2">
      <View className="flex-row gap-2">
        {buttons.map(({ label, Icon, onPress }) => (
          <Pressable
            key={label}
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`${label} this week's song`}
            accessibilityState={{ disabled, busy }}
            className={`h-11 flex-row items-center gap-2 rounded-pill border border-border bg-surface/60 px-4 ${disabled ? "opacity-50" : ""}`}
          >
            <Icon color={colours.textSecondary} size={16} strokeWidth={1.5} />
            <Text className="font-sans-medium text-caption text-secondary">
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {message && (
        <Text
          accessibilityLiveRegion="polite"
          className="font-sans text-caption text-muted"
        >
          {message}
        </Text>
      )}
      <ShareSheet
        visible={writing}
        onShare={share}
        onClose={() => setWriting(false)}
      />
            <AddToPlaylistSheet
        visible={choosing}
        song={playlistSong}
        onDone={setMessage}
        onClose={() => setChoosing(false)}
      />
    </View>
  );
}
