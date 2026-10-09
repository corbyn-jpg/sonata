import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import {
  ArchiveRestore,
  Bell,
  Clock,
  Download,
  FileLock,
  Lock,
  Trash2,
  Vibrate,
} from "lucide-react-native";
import { BackHeader } from "@/components/BackHeader";
import { Screen } from "@/components/Screen";
import { pickBackup } from "@/features/settings/backup";
import { BackupSheet } from "@/features/settings/BackupSheet";
import { exportMyData } from "@/features/settings/exportMyData";
import { RestoreSheet } from "@/features/settings/RestoreSheet";
import { SettingGroup, SettingRow } from "@/features/settings/SettingRow";
import { TimeSheet } from "@/features/settings/TimeSheet";
import { feelNote } from "@/haptics";
import { isBackup } from "@/lib/backupFile";
import { PdfUnavailable } from "@/lib/pdf";
import { setPreference, usePreference } from "@/lib/preferences";
import { cancelReminder, scheduleReminder, timeLabel } from "@/lib/reminder";
import { DeleteSheet } from "@/features/settings/DeleteSheet";
import colours from "@/theme/colours";

const switchColours = {
  trackColor: { false: colours.surfaceRaised, true: colours.violet[700] },
  thumbColor: colours.textPrimary,
};

/** Settings & data privacy: flat, no washes (a functional screen, §6). */
export default function Settings() {
  const feelNotes = usePreference("feelNotes");
  const reminder = usePreference("reminder");
  const reminderAt = usePreference("reminderAt");
  const [pickingTime, setPickingTime] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null); // the chosen backup file's text

  const onFeelNotesChange = (on: boolean) => {
    setPreference("feelNotes", on);
    if (on) feelNote("E", "major"); // a sample, so you know what to expect
  };

  /** Schedule at `at`; if the phone won't allow it, say why and leave the reminder off. */
  const remindAt = async (at: number) => {
    const result = await scheduleReminder(at);
    if (result === "scheduled") return true;
    if (result === "unavailable")
      Alert.alert(
        "Reminders need the new app build",
        "Install the latest development build, then turn this on again.",
      );
    else
      Alert.alert(
        "Notifications are off for Sonata",
        "Turn them on in your phone's settings to get a daily reminder.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open settings", onPress: () => void Linking.openSettings() },
        ],
      );
    setPreference("reminder", false);
    return false;
  };

  const onReminderChange = async (on: boolean) => {
    if (!on) {
      setPreference("reminder", false);
      await cancelReminder();
      return;
    }
    setPreference("reminder", true); // the switch moves straight away; it goes back if not allowed
    await remindAt(reminderAt);
  };

  const setReminderTime = (at: number) => {
    setPickingTime(false);
    setPreference("reminderAt", at);
    if (reminder) void remindAt(at);
  };

  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportMyData();
    } catch (error) {
      if (error instanceof PdfUnavailable)
        Alert.alert(
          "Export needs the new app build",
          "Install the latest development build, then try again.",
        );
      else {
        console.warn(
          "Couldn't export the data:",
          error instanceof Error ? error.message : error,
        ); // never the data itself
        Alert.alert("Couldn't make the PDF", "Please try again.");
      }
    } finally {
      setExporting(false);
    }
  };

  /** Pick a backup file; only a real Sonata backup gets as far as asking for the passphrase. */
  const chooseBackup = async () => {
    try {
      const text = await pickBackup();
      if (text === null) return;
      if (isBackup(text)) setRestoring(text);
      else
        Alert.alert(
          "That isn't a Sonata backup",
          "Choose the .json file Sonata made when you backed up.",
        );
    } catch (error) {
      console.warn(
        "Couldn't open the file:",
        error instanceof Error ? error.message : error,
      );
      Alert.alert("Couldn't open that file", "Please try again.");
    }
  };

  return (
    <Screen header={<BackHeader title="Settings" />}>
      <ScrollView
        contentContainerClassName="pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* What Sonata promises, before any setting */}
        <View className="flex-row items-center gap-3">
          <Lock color={colours.teal[300]} size={18} strokeWidth={1.5} />
          <Text className="flex-1 font-sans text-caption text-teal-300">
            Everything you log is encrypted on this phone. No account, no
            trackers.
          </Text>
        </View>

        <SettingGroup title="Accessibility">
          <SettingRow
            Icon={Vibrate}
            title="Feel notes"
            detail="Each note has its own vibration, so you can feel it as well as hear it. More pulses mean a higher note; low notes feel heavier."
            right={
              <Switch
                value={feelNotes}
                onValueChange={onFeelNotesChange}
                accessibilityLabel="Feel notes"
                {...switchColours}
              />
            }
          />
        </SettingGroup>

        <SettingGroup title="Reminders">
          <SettingRow
            Icon={Bell}
            title="Daily reminder"
            detail={`${timeLabel(reminderAt)} · a quiet nudge, no badge`}
            right={
              <Switch
                value={reminder}
                onValueChange={(on) => void onReminderChange(on)}
                accessibilityLabel="Daily reminder"
                {...switchColours}
              />
            }
          />
          {reminder && (
            <SettingRow
              Icon={Clock}
              title="Reminder time"
              detail={`Every day at ${timeLabel(reminderAt)}`}
              onPress={() => setPickingTime(true)}
            />
          )}
        </SettingGroup>
        {pickingTime && (
          <TimeSheet
            minutes={reminderAt}
            onDone={setReminderTime}
            onClose={() => setPickingTime(false)}
          />
        )}

        <SettingGroup title="Privacy and data">
          <SettingRow
            Icon={Download}
            title="Export my data"
            detail="A readable PDF of your check-ins, thought records and playlists. It isn't encrypted, so keep it private."
            onPress={() => void exportData()}
            right={
              exporting ? (
                <ActivityIndicator color={colours.violet[200]} />
              ) : undefined
            }
          />
          <SettingRow
            Icon={FileLock}
            title="Back up to a file"
            detail="Everything you've logged, locked with a passphrase, so you can bring it back on a new phone."
            onPress={() => setBackingUp(true)}
          />
          <SettingRow
            Icon={ArchiveRestore}
            title="Restore from a backup"
            detail="Adds a backup's check-ins, thought records and playlists. Nothing here is replaced."
            onPress={() => void chooseBackup()}
          />
          <SettingRow
            Icon={Trash2}
            title="Delete all data"
            detail="From this phone and the online backup. This can't be undone."
            onPress={() => setDeleting(true)}
            danger
          />
        </SettingGroup>
        {deleting && <DeleteSheet onClose={() => setDeleting(false)} />}
        {backingUp && <BackupSheet onClose={() => setBackingUp(false)} />}
        {restoring !== null && (
          <RestoreSheet text={restoring} onClose={() => setRestoring(null)} />
        )}

        <SettingGroup title="Credits">
          <View className="gap-2 py-4">
            <Text className="font-sans text-caption text-secondary">
              Piano: Salamander Grand Piano by Alexander Holm, licensed under CC
              BY 3.0.
            </Text>
            <Text className="font-sans text-caption text-secondary">
              Violin, harp, flute, glockenspiel and chimes: VSCO 2 Community
              Edition by Versilian Studios (CC0).
            </Text>
            <Text className="font-sans text-caption text-secondary">
              Calming sounds: Moodist (Pixabay Content License and CC0).
            </Text>
            <Text className="font-sans text-caption text-secondary">
              Songs are written by a model trained on J.S. Bach&apos;s chorales
              (the JSB Chorales dataset), on this phone.
            </Text>
          </View>
        </SettingGroup>
      </ScrollView>
    </Screen>
  );
}
