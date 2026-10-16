import AsyncStorage from "@react-native-async-storage/async-storage";
import { forgetCheckinsAt, getCheckinDates, restoreCheckins } from "@/lib/checkins";
import { dayKey } from "@/lib/dates";
import { sampleEntries, sampleRange } from "./sampleMonths";

// Adding and removing the sample months. They're ordinary check-ins (sealed, saved on the phone and backed up), and when each was made is kept here so exactly those can be taken out again.

const SAMPLES_KEY = "sonata.samples.v1"; // "sonata." so Delete all data clears it too

async function sampleTimestamps(): Promise<number[]> {
  const saved = await AsyncStorage.getItem(SAMPLES_KEY).catch(() => null);
  return saved ? (JSON.parse(saved) as number[]) : [];
}

export async function hasSampleMonths() {
  return (await sampleTimestamps()).length > 0;
}

/** Fill the months before this one, around any real check-ins already there. Returns how many were added. */
export async function addSampleMonths(today = new Date()) {
  const { from, to } = sampleRange(today);
  const taken = new Set((await getCheckinDates(from)).map(dayKey));
  const entries = sampleEntries(from, to, taken);
  await restoreCheckins(entries);
  await AsyncStorage.setItem(
    SAMPLES_KEY,
    JSON.stringify([...(await sampleTimestamps()), ...entries.map((e) => e.timestamp)]),
  );
  return entries.length;
}

/** Take the sample check-ins out again, from the phone and the backup. Real check-ins stay. */
export async function removeSampleMonths() {
  const removed = await forgetCheckinsAt(await sampleTimestamps());
  await AsyncStorage.removeItem(SAMPLES_KEY);
  return removed;
}
