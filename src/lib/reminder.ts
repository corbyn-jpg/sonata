import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";

// The daily reminder: a local notification, scheduled on this phone. Nothing is sent to a server and no push token is ever asked for. expo-notifications is loaded only when needed and only if this build of the app has it (importing it on an older build would crash at launch, as expo-print did, problem 51).

const CHANNEL = "daily-reminder";

/** Minutes after midnight → "21:30". */
export const timeLabel = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** The time `steps` quarter-hours later (or earlier), wrapping round midnight. */
export const stepTime = (minutes: number, steps: number) =>
  (((minutes + steps * 15) % 1440) + 1440) % 1440;

/** Whether this build of the app can schedule notifications at all. */
export const canRemind = () =>
  requireOptionalNativeModule("ExpoNotificationScheduler") !== null;

async function notifications() {
  return canRemind() ? import("expo-notifications") : null;
}

/** A reminder that arrives while Sonata is open is shown quietly too: no sound, no badge. Call once at launch. */
export async function setUpReminders() {
  const n = await notifications();
  n?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export type ReminderResult = "scheduled" | "not-allowed" | "unavailable";

/** Schedule the one daily reminder at `minutes` after midnight, replacing any earlier one. Asks permission the first time. */
export async function scheduleReminder(
  minutes: number,
): Promise<ReminderResult> {
  const n = await notifications();
  if (!n) return "unavailable";
  // Android only shows the permission prompt once a channel exists
  if (Platform.OS === "android")
    await n.setNotificationChannelAsync(CHANNEL, {
      name: "Daily reminder",
      importance: n.AndroidImportance.DEFAULT,
    });
  let permission = await n.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain)
    permission = await n.requestPermissionsAsync();
  if (!permission.granted) return "not-allowed";

  await n.cancelAllScheduledNotificationsAsync();
  await n.scheduleNotificationAsync({
    content: { title: "Sonata", body: "A moment to pick today's orb." },
    trigger: {
      type: n.SchedulableTriggerInputTypes.DAILY,
      hour: Math.floor(minutes / 60),
      minute: minutes % 60,
      channelId: CHANNEL,
    },
  });
  return "scheduled";
}

export async function cancelReminder() {
  const n = await notifications();
  await n?.cancelAllScheduledNotificationsAsync();
}
