import { Directory, File, Paths } from "expo-file-system";
import Share from "react-native-share";

// Files that leave the app (backups, sheet music, PDFs, songs) are made on the phone and go out through the share
// sheet; nothing is uploaded by Sonata. The browser's versions are in files.web.ts.

/** A file in the cache's share folder, under the name it should have once it leaves the app. */
export function shareFile(name: string) {
  const folder = new Directory(Paths.cache, "share");
  folder.create({ idempotent: true });
  return new File(folder, name);
}

/** Write `text` to a file called `name` and open the share sheet with it. */
export async function shareTextFile(
  name: string,
  text: string,
  type: string,
  title: string,
) {
  const file = shareFile(name);
  file.create({ overwrite: true });
  file.write(text);
  await Share.open({ url: file.uri, type, title, failOnCancel: false });
}

/** Ask for a file with the system picker. Its text, or null if the user backs out. */
export async function pickTextFile(): Promise<string | null> {
  const picked = await File.pickFileAsync(); // any type: cloud drives label .json files inconsistently
  return picked.canceled ? null : picked.result.text();
}
