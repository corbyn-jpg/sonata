import { useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { BottomSheet } from "@/components/BottomSheet";
import { WrongPassphrase } from "@/lib/backupFile";
import colours from "@/theme/colours";
import { restoreBackup, type Restored } from "./backup";
import { PassphraseField } from "./PassphraseField";

type Props = {
  /** The backup file's text (already checked to be a Sonata backup). */
  text: string;
  onClose: () => void;
};

const count = (n: number, one: string, many: string) =>
  n === 1 ? `1 ${one}` : `${n} ${many}`;

/** "Added 12 check-ins and 1 playlist." */
function summary({ checkins, thoughtRecords, playlists, pieces }: Restored) {
  const parts = [
    checkins && count(checkins, "check-in", "check-ins"),
    thoughtRecords &&
      count(thoughtRecords, "thought record", "thought records"),
    playlists && count(playlists, "playlist", "playlists"),
    pieces && count(pieces, "piece", "pieces"),
  ].filter(Boolean);
  if (parts.length === 0) return "Everything in this backup is already here.";
  const last = parts.pop();
  return `Added ${parts.length > 0 ? `${parts.join(", ")} and ${last}` : last}.`;
}

/** Restore from a backup: the passphrase opens it, and only what isn't on this phone yet is added. */
export function RestoreSheet({ text, onClose }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [state, setState] = useState<"idle" | "opening" | "wrong" | "failed">(
    "idle",
  );
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  const opening = state === "opening";
  const ready = passphrase.length > 0 && !opening;

  const restore = async () => {
    if (!ready) return;
    setState("opening");
    try {
      const message = summary(
        await restoreBackup(text, passphrase, (d) =>
          setProgress(Math.round(d * 100)),
        ),
      );
      setDone(message);
      AccessibilityInfo.announceForAccessibility(message);
    } catch (error) {
      if (error instanceof WrongPassphrase) setState("wrong");
      else {
        console.warn(
          "Couldn't restore the backup:",
          error instanceof Error ? error.message : error,
        ); // never the data itself
        setState("failed");
      }
    }
  };

  const close = () => {
    if (!opening || done) onClose();
  };

  return (
    <BottomSheet
      visible
      onClose={close}
      avoidKeyboard
      className="gap-5 px-6 pt-6"
    >
      <View className="gap-2">
        <Text
          className="font-mono-medium text-h4 text-primary"
          accessibilityRole="header"
        >
          Restore from a backup
        </Text>
        <Text className="font-sans text-body text-secondary">
          {done ??
            "Type the passphrase you chose when you made it. Anything already on this phone stays as it is."}
        </Text>
      </View>

      {done ? (
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          className="min-h-[52px] items-center justify-center rounded-pill bg-violet-700 active:opacity-80"
        >
          <Text className="font-sans-bold text-body text-primary">Done</Text>
        </Pressable>
      ) : (
        <>
          <PassphraseField
            label="Passphrase"
            value={passphrase}
            onChange={(next) => {
              setPassphrase(next);
              if (state === "wrong") setState("idle");
            }}
            editable={!opening}
            onSubmit={() => void restore()}
          />

          <View className="gap-3">
            <Pressable
              onPress={() => void restore()}
              disabled={!ready}
              accessibilityRole="button"
              accessibilityState={{ disabled: !ready, busy: opening }}
              className={`min-h-[52px] flex-row items-center justify-center gap-2 rounded-pill bg-violet-700 active:opacity-80 ${ready || opening ? "" : "opacity-40"}`}
            >
              {opening && <ActivityIndicator color={colours.textPrimary} />}
              <Text className="font-sans-bold text-body text-primary">
                {opening ? `Opening… ${progress}%` : "Restore"}
              </Text>
            </Pressable>
            {(state === "wrong" || state === "failed") && (
              <Text
                className="font-sans text-caption"
                style={{ color: colours.danger }}
                accessibilityLiveRegion="polite"
              >
                {state === "wrong"
                  ? "That passphrase doesn't open this backup."
                  : "Couldn't restore the backup. Please try again."}
              </Text>
            )}
            <Pressable
              onPress={close}
              disabled={opening}
              accessibilityRole="button"
              className={`min-h-[44px] items-center justify-center ${opening ? "opacity-40" : ""}`}
            >
              <Text className="font-sans-medium text-body text-secondary">
                Cancel
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </BottomSheet>
  );
}
