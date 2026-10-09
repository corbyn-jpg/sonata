import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { BottomSheet } from "@/components/BottomSheet";
import { MIN_PASSPHRASE } from "@/lib/backupFile";
import colours from "@/theme/colours";
import { makeBackup } from "./backup";
import { PassphraseField } from "./PassphraseField";

type Props = { onClose: () => void };

/**
 Back up to a file: the passphrase is typed twice, because a typo here would lock the backup for good. Success needs no message: the share sheet opening is the result.
 */
export function BackupSheet({ onClose }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [again, setAgain] = useState("");
  const [locking, setLocking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  const long = passphrase.length >= MIN_PASSPHRASE;
  const matches = again === passphrase;
  const ready = long && matches && !locking;

  const make = async () => {
    if (!ready) return;
    setLocking(true);
    setFailed(false);
    try {
      await makeBackup(passphrase, (done) =>
        setProgress(Math.round(done * 100)),
      );
      onClose();
    } catch (error) {
      console.warn(
        "Couldn't make the backup:",
        error instanceof Error ? error.message : error,
      ); // never the data itself
      setFailed(true);
      setLocking(false);
    }
  };

  const close = () => {
    if (!locking) onClose();
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
          Back up to a file
        </Text>
        <Text className="font-sans text-body text-secondary">
          Your check-ins, thought records and playlists, locked with a
          passphrase. Keep the file somewhere safe, like your cloud drive.
        </Text>
        <Text className="font-sans text-caption text-secondary">
          Sonata can&apos;t recover a forgotten passphrase. A short sentence is
          easier to remember than a password.
        </Text>
      </View>

      <PassphraseField
        label="Passphrase"
        value={passphrase}
        onChange={setPassphrase}
        editable={!locking}
        note={
          passphrase.length > 0 && !long
            ? `At least ${MIN_PASSPHRASE} characters`
            : null
        }
      />
      <PassphraseField
        label="Passphrase again"
        value={again}
        onChange={setAgain}
        editable={!locking}
        onSubmit={() => void make()}
        note={
          again.length >= passphrase.length && again.length > 0 && !matches
            ? "These don't match yet"
            : null
        }
      />

      <View className="gap-3">
        <Pressable
          onPress={() => void make()}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready, busy: locking }}
          className={`min-h-[52px] flex-row items-center justify-center gap-2 rounded-pill bg-violet-700 active:opacity-80 ${ready || locking ? "" : "opacity-40"}`}
        >
          {locking && <ActivityIndicator color={colours.textPrimary} />}
          <Text className="font-sans-bold text-body text-primary">
            {locking ? `Locking… ${progress}%` : "Make backup"}
          </Text>
        </Pressable>
        {failed && (
          <Text
            className="font-sans text-caption"
            style={{ color: colours.danger }}
            accessibilityLiveRegion="polite"
          >
            Couldn&apos;t make the backup. Please try again.
          </Text>
        )}
        <Pressable
          onPress={close}
          disabled={locking}
          accessibilityRole="button"
          className={`min-h-[44px] items-center justify-center ${locking ? "opacity-40" : ""}`}
        >
          <Text className="font-sans-medium text-body text-secondary">
            Not now
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
