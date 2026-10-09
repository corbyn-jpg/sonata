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
import { Bell, Clock, Download, Lock, Vibrate } from "lucide-react-native";
import { BackHeader } from "@/components/BackHeader";
import { Screen } from "@/components/Screen";
import { exportMyData } from "@/features/settings/exportMyData";
import { SettingGroup, SettingRow } from "@/features/settings/SettingRow";
import { TimeSheet } from "@/features/settings/TimeSheet";
import { feelNote } from "@/haptics";
import { PdfUnavailable } from "@/lib/pdf";
import { setPreference, usePreference } from "@/lib/preferences";
import { cancelReminder, scheduleReminder, timeLabel } from "@/lib/reminder";
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
        </SettingGroup>

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
