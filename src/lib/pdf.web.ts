// The browser's version of pdf.ts: the page opens in the browser's print dialog, where "Save as PDF" makes the file.

/** Kept so imports match pdf.ts; the browser can always print. */
export class PdfUnavailable extends Error {}

/** Open the print dialog with `html`, titled `fileName` so a saved PDF is named after it. */
export function shareAsPdf(html: string, fileName: string, _title: string) {
  return new Promise<void>((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.style.cssText =
      "position:fixed;width:0;height:0;border:0;visibility:hidden";
    frame.srcdoc = html;
    frame.onload = () => {
      const page = frame.contentWindow;
      if (!page) return reject(new Error("Couldn't open the page to print"));
      page.document.title = fileName;
      page.onafterprint = () => {
        frame.remove();
        resolve();
      };
      page.focus();
      page.print();
    };
    document.body.appendChild(frame);
  });
}
