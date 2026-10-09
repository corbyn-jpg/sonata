import { requireOptionalNativeModule } from "expo";
import { Directory, File, Paths } from "expo-file-system";
import Share from "react-native-share";

// PDFs (sheet music, Export my data) are made on the phone and leave through the share sheet. Nothing is uploaded by Sonata. expo-print is loaded only when needed and only if this build has it (problem 51).

/** Thrown when the app was built before expo-print was added: PDFs need a new development build. */
export class PdfUnavailable extends Error {}

/** A file in the cache's share folder, under the name it should have once it leaves the app. */
export function shareFile(name: string) {
  const folder = new Directory(Paths.cache, "share");
  folder.create({ idempotent: true });
  return new File(folder, name);
}

/** Print `html` to an A4 PDF named `fileName`.pdf and open the share sheet with it. */
export async function shareAsPdf(
  html: string,
  fileName: string,
  title: string,
) {
  if (!requireOptionalNativeModule("ExpoPrint"))
    throw new PdfUnavailable("This build can't make PDFs yet");
  const { printToFileAsync } = await import("expo-print");
  const { uri } = await printToFileAsync({
    html,
    width: 595, // A4 in points
    height: 842,
    margins: { top: 45, right: 45, bottom: 45, left: 45 }, // iOS; Android uses the page's @page rule
  });
  const file = shareFile(`${fileName}.pdf`);
  new File(uri).copySync(file, { overwrite: true });
  await Share.open({
    url: file.uri,
    type: "application/pdf",
    title,
    failOnCancel: false,
  });
}
