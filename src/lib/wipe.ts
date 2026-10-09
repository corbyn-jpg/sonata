import AsyncStorage from "@react-native-async-storage/async-storage";
import { reloadAppAsync } from "expo";
import { Directory, Paths } from "expo-file-system";
import { deleteUser, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  getDocsFromServer,
  query,
  where,
} from "firebase/firestore";
import { forgetKey } from "@/lib/crypto/key";
import type { Wipe } from "@/lib/deleteEverything";
import { auth, db } from "@/lib/firebase";
import { cancelReminder } from "@/lib/reminder";
import { getUserId } from "@/lib/session";
import { withTimeout } from "@/lib/timeout";

// The real steps of "Delete all data" (the order lives in deleteEverything.ts).

/** Every Firestore collection that holds the user's records. */
const COLLECTIONS = ["daily_checkins", "playlists", "cbt_thought_records"];

/** Every record this user owns on the server, read from the server itself (not a cached copy), then deleted. */
async function deleteServerData() {
  const uid = await withTimeout(getUserId());
  for (const name of COLLECTIONS) {
    const mine = await withTimeout(
      getDocsFromServer(
        query(collection(db, name), where("user_id", "==", uid)),
      ),
    );
    await Promise.all(
      mine.docs.map((record) => withTimeout(deleteDoc(record.ref))),
    );
  }
}

async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) return;
  await deleteUser(user).catch(() => signOut(auth));
}

/** Records, preferences and flags (every key starts "sonata."), the encryption key, cached songs and exported files, and the reminder. */
async function wipePhone() {
  await cancelReminder().catch(() => {});
  const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
    key.startsWith("sonata."),
  );
  await AsyncStorage.multiRemove(keys);
  await forgetKey();
  for (const item of new Directory(Paths.cache).list()) {
    const ours =
      item instanceof Directory
        ? item.name === "share"
        : /\.(wav|pdf|musicxml)$/.test(item.name);
    if (ours) item.delete();
  }
}

export const wipe: Wipe = {
  deleteServerData,
  deleteAccount,
  wipePhone,
  restart: () => reloadAppAsync("All data deleted"),
};
