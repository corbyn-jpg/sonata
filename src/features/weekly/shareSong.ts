import { Directory, File, Paths } from "expo-file-system";
import Share from "react-native-share";

// The song is rendered to the cache under an internal name (song-<week>-<hash>-piano.wav). Before it leaves the app it gets a proper name, so it reads well in WhatsApp, email or the Files app.

const MIME = "audio/x-wav"; // the type Android knows .wav files by

/** A copy of the song under its proper name, kept in the cache. */
function namedCopy(uri: string, name: string) {
  const folder = new Directory(Paths.cache, "share");
  folder.create({ idempotent: true });
  const copy = new File(folder, name);
  new File(uri).copySync(copy, { overwrite: true });
  return copy;
}

/**
 Open the phone's share sheet (WhatsApp, email, Save to Files…) with the song and, if given, a message to go with it. The message goes straight to the other app: Sonata never keeps it.
 */
export async function shareSong(uri: string, name: string, message?: string) {
  await Share.open({
    url: namedCopy(uri, name).uri,
    type: MIME,
    message: message?.trim() || undefined,
    subject: "A song from my week", // the subject line in email apps
    title: "Share your song",
    failOnCancel: false, // closing the share sheet isn't an error
  });
}

/**
 Save the song into a folder the user picks (Android only: on iPhone the share sheet already has "Save to Files"). Returns false if they backed out of the picker.
 */
export async function saveSong(uri: string, name: string): Promise<boolean> {
  let folder: Directory;
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch {
    return false; // closed the picker without choosing
  }
  const target = folder.createFile(name, MIME); // Android adds " (1)" if the name is taken
  target.write(await new File(uri).bytes());
  return true;
}