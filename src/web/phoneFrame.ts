import { Asset } from "expo-asset";
import { toQR } from "toqr";
import colours from "@/theme/colours";

// On a laptop or tablet, Sonata runs in a phone-sized window (an iframe of the same address), so every screen is laid
// out exactly as on a phone. Beside it: what Sonata is, the Android app, and a QR code to open it on a phone. Inside
// the iframe, and on phones, the app fills the page as normal.

const PHONE = { width: 390, height: 844 };
const APK =
  "https://drive.google.com/drive/folders/1TSTR6GvHg4YzDFPr-_MPiRuAzqEMyi2Q";

/** Whether this page should show the frame instead of the app itself. */
export const wantsFrame = () =>
  window.top === window &&
  matchMedia("(min-width: 700px) and (min-height: 500px)").matches;

/** The address as a QR code: a square SVG of dark cells on a light tile, with the standard four-cell margin. */
function qrSvg(text: string) {
  const cells = toQR(text);
  const size = Math.sqrt(cells.length);
  let path = "";
  cells.forEach((on, i) => {
    if (on) path += `M${(i % size) + 4} ${Math.floor(i / size) + 4}h1v1h-1z`;
  });
  return `<svg viewBox="0 0 ${size + 8} ${size + 8}" role="img" aria-label="QR code for ${text}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="var(--qr-light)"/><path d="${path}" fill="var(--qr-dark)"/></svg>`;
}

const font = (family: string, source: number) =>
  `@font-face { font-family: "${family}"; src: url("${Asset.fromModule(source).uri}"); font-display: swap; }`;

export function showFrame() {
  const style = document.createElement("style");
  style.textContent = `
    ${font("DM Mono", require("@expo-google-fonts/dm-mono/500Medium/DMMono_500Medium.ttf"))}
    ${font("Roboto", require("@expo-google-fonts/roboto/400Regular/Roboto_400Regular.ttf"))}
    ${font("Roboto Medium", require("@expo-google-fonts/roboto/500Medium/Roboto_500Medium.ttf"))}
    :root {
      --canvas: ${colours.canvas};
      --sky-1: #1C0A44;
      --sky-2: #0E0529;
      --border: ${colours.border};
      --text: ${colours.textPrimary};
      --text-2: ${colours.textSecondary};
      --muted: ${colours.textMuted};
      --violet: ${colours.violet[500]};
      --violet-200: ${colours.violet[200]};
      --action: ${colours.teal[700]};
      --qr-light: ${colours.textPrimary};
      --qr-dark: ${colours.canvas};
      --mono: "DM Mono", ui-monospace, monospace;
      --sans: "Roboto", system-ui, sans-serif;
      --sans-medium: "Roboto Medium", "Roboto", system-ui, sans-serif;
    }
    html, body { overflow-x: clip; }
    body {
      margin: 0;
      background: radial-gradient(ellipse at 68% 45%, var(--sky-1), var(--sky-2) 55%, var(--canvas));
      color: var(--text);
      font-family: var(--sans);
    }
    #root { display: none; }
    .stage {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: clamp(32px, 6vw, 96px);
      padding: 0 32px;
      box-sizing: border-box;
    }
    .about { max-width: 340px; min-width: 0; }
    .wordmark { font-family: var(--mono); font-size: 18px; color: var(--violet-200); margin: 0 0 20px; }
    h1 { font-family: var(--sans-medium); font-weight: normal; font-style: normal; font-size: 40px; line-height: 1.15; margin: 0 0 16px; overflow-wrap: anywhere; text-wrap: balance; }
    .lead { font-size: 17px; line-height: 1.6; color: var(--text-2); margin: 0 0 28px; }
    .android {
      display: inline-flex; align-items: center; min-height: 44px; padding: 0 22px; border-radius: 999px;
      background: var(--action); color: #fff; font-family: var(--sans-medium); font-size: 15px; text-decoration: none; white-space: nowrap;
    }
    .android:hover { filter: brightness(1.12); }
    .android:focus-visible { outline: 2px solid var(--violet-200); outline-offset: 3px; }
    .note { font-size: 13px; line-height: 1.6; color: var(--muted); margin: 12px 0 0; }
    .qr { display: flex; align-items: center; gap: 16px; margin: 36px 0 0; }
    .qr svg { width: 104px; height: 104px; border-radius: 12px; flex: none; }
    .qr figcaption { font-size: 13px; line-height: 1.6; color: var(--text-2); }
    .screen {
      flex: none;
      border-radius: 44px;
      overflow: hidden;
      border: 1px solid var(--border);
      box-shadow: 0 0 120px -20px color-mix(in srgb, var(--violet) 45%, transparent);
    }
    .screen iframe { display: block; border: 0; transform-origin: 0 0; background: var(--canvas); }
    @media (max-width: 899px) { .qr { display: none; } h1 { font-size: 32px; } }
  `;
  document.head.appendChild(style);

  const stage = document.createElement("main");
  stage.className = "stage";
  stage.innerHTML = `
    <section class="about">
      <p class="wordmark">Sonata</p>
      <h1>Your days, in music.</h1>
      <p class="lead">One orb a day, one song a week. This is the browser version, so you can try Sonata without an Android phone.</p>
      <a class="android" href="${APK}" target="_blank" rel="noopener">Get the Android app</a>
      <p class="note">Feel notes and a daily reminder are only in the Android app.</p>
      <figure class="qr">${qrSvg(location.origin)}<figcaption>Scan to open Sonata on your phone. You can add it to your home screen from there.</figcaption></figure>
    </section>
    <div class="screen"><iframe title="Sonata" allow="autoplay; web-share; clipboard-write"></iframe></div>
  `;
  document.body.appendChild(stage);

  const screen = stage.querySelector<HTMLDivElement>(".screen")!;
  const frame = stage.querySelector("iframe")!;
  frame.width = String(PHONE.width);
  frame.height = String(PHONE.height);
  frame.src = location.pathname + location.search;
  frame.addEventListener("load", () => frame.focus()); // so the arrow keys reach the app straight away

  // Shrink the whole phone, not its layout, to fit shorter windows
  const fit = () => {
    const scale = Math.min(1, (innerHeight - 48) / PHONE.height);
    frame.style.transform = `scale(${scale})`;
    screen.style.width = `${PHONE.width * scale}px`;
    screen.style.height = `${PHONE.height * scale}px`;
    screen.style.borderRadius = `${44 * scale}px`;
  };
  fit();
  addEventListener("resize", fit);
}
