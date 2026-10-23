// The browser's versions of files.ts. Where the browser can share files (most phones), it opens the share menu;
// otherwise the file downloads. Picking a file uses the browser's own file picker.

/** Share `file` through the browser's share menu if it can take files, or else download it. */
export async function shareOrDownload(file: File, text?: string) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return; // closed the share menu
      // Some browsers refuse a file type they can't share: fall back to a download
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function shareTextFile(
  name: string,
  text: string,
  type: string,
  _title: string,
) {
  await shareOrDownload(new File([text], name, { type }));
}

export function pickTextFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () =>
      resolve((await input.files?.[0]?.text()) ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
