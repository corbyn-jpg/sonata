import { shareOrDownload } from "@/lib/files.web";

// The browser's version of shareSong.ts: the song is already in memory (a blob URL), so it's given its proper name
// and shared from there, or downloaded where the browser can't share files.

async function namedFile(uri: string, name: string) {
  const blob = await (await fetch(uri)).blob();
  return new File([blob], name, { type: "audio/wav" });
}

export async function shareSong(uri: string, name: string, message?: string) {
  await shareOrDownload(
    await namedFile(uri, name),
    message?.trim() || undefined,
  );
}

/** A download: the browser decides where it goes. */
export async function saveSong(uri: string, name: string): Promise<boolean> {
  await shareOrDownload(await namedFile(uri, name));
  return true;
}
