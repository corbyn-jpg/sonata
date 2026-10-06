# Sonata problem log

Every problem hit while building Sonata: what we saw, why it happened and how it was fixed. Grouped by build stage (CLAUDE.md §8), oldest first. New problems are added as they come up.

Each entry has:

- **Seen:** what showed up
- **Cause:** why it happened
- **Fix:** how it was solved
- **Lesson:** where there's something to remember for next time

---

## Open problems

- **React Compiler lint errors** ("Cannot access refs during render", "This value cannot be modified") in several Home and Weekly files. The app runs, but `npx expo lint` fails. These need a clean-up pass before the audit (stage 11).
- **`WavyTransport.tsx` is unused.** It was replaced by `OrbitTransport` and can be deleted.

---

## Stages 1–2: Foundation and security

### 1. Firebase persistence errors (`getReactNativePersistence`)
- **Cause:** two things:
  - The wrong package was installed: `react-native-async-storage` (an old third-party package) instead of the official `@react-native-async-storage/async-storage`.
  - A `tsconfig.json` edit had replaced the `@/` path alias.
- **Fix:** `npx expo install @react-native-async-storage/async-storage`, and put `"@/*": ["./src/*"]` back.
- **Lesson:** always add packages with `npx expo install` so you get the version that matches the SDK.

### 2. `npx tsc` offered to download a package called "tsc", and `npm test` found no package.json
- **Cause:** the terminal was in a different project (Envol), not Sonata.
- **Fix:** `cd` into `Sonata\sonata` before running commands.

### 3. `await` in the Home component threw errors
- **Cause:** `await` only works inside an `async` function, not directly in a component.
- **Fix:** put it inside a button's `onPress` handler.

### 4. "Rendered more hooks than during the previous render" in `_layout.tsx`
- **Cause:** the sign-in `useEffect` was below the early `return null` used while fonts load, so the number of hooks changed between renders.
- **Fix:** move the effect above the early return.
- **Lesson:** every hook goes above any early `return`.

### 5. `auth/network-request-failed`, then HTTP 403, then `auth/admin-restricted-operation`
- **Cause:** Anonymous sign-in wasn't enabled in the Firebase project. The first errors were generic and hid this.
- **Fix:**
  - Show Firebase's `customData.message` in the error alert to get the real reason.
  - Then in the Firebase console: Authentication → Sign-in method → Anonymous → Enable.

### 6. GitHub "Secrets detected" alert for a Google API key
- **Cause:** GitHub flags the Firebase web `apiKey` in `src/lib/firebase.ts`.
- **Fix:** nothing to change in the code. That key only identifies the project and ends up inside every build anyway. The data is protected by anonymous sign-in plus the Security Rules, and every payload is encrypted on the phone.

---

## Stages 3–4: Glow orbs and Home

### 7. Note letters didn't show in the grid
- **Cause:** the first version never drew labels.
- **Fix:** added `displayName` (for example "E♭") to the grid. The carousel still shows no letters.

### 8. Only E, A and B had a ♭ on the Dark page
- **Cause:** not a bug. C minor only flattens the 3rd, 6th and 7th notes, so C, D, F and G are the same in both keys.
- **Fix:** none needed.

### 9. Carousel swipe wasn't smooth and sometimes ignored swipes
- **Cause:**
  - Android's `ScrollView` snapping is unreliable, and only the carousel's own box picked up swipes.
  - Every orb was drawn twice, and all of them shimmered constantly.
- **Fix:** a gesture-handler pan running on the UI thread and settling with a spring. Only the orbs that can be on screen are drawn, and only the centre one shimmers.

### 10. Changes "made" but the phone still showed the old carousel
- **Cause:** the files were typed in VS Code but not saved, and Metro only sees saved files.
- **Fix:** Save All (Ctrl+K, then S), and turn on File → Auto Save.

### 11. "Cannot use JSX unless the '--jsx' flag is provided" on every file
- **Cause:** VS Code's TypeScript checker read the config halfway through an `npm install` and remembered it as missing. The code itself was fine: `npx tsc` passed.
- **Fix:** Ctrl+Shift+P → **TypeScript: Restart TS Server**.

### 12. `OrbCarousel` type errors (`initialIndex` doesn't exist, string not assignable to number)
- **Cause:** the file was half the old version and half the new one.
- **Fix:** replace the whole file.
- **Lesson:** when a file is meant to be replaced, replace all of it.

### 13. Everything was laggy on the Samsung A55
- **Cause:** with react-native-svg, every glow, star and wash is its own native layer, about 20–30 large see-through layers to redraw every frame.
- **Fix:** moved all glows, orbs, washes and stars to Skia, with one shared GPU canvas per area. The lag was gone.

### 14. `DerivedValue<number>` not assignable to `number` (`softness` on `GlowOrb`)
- **Cause:** `GlowOrb.tsx` was still the old SVG version, and the carousel used `GlowOrb` where it needed the Skia `Orb`.
- **Fix:** replace the file, and use `Orb` inside shared canvases.

### 15. "View config getter callback for component `skLine` must be a function"
- **Cause:** `<NoteStaff>`, which draws Skia shapes, was placed after `</Canvas>`.
- **Fix:** move it inside the Canvas.
- **Lesson:** Skia elements (Line, Oval, Path, …) only work inside a Skia `<Canvas>`.

---

## Stage 5: Audio

### 16. EAS build crashed reading `app.json`
- **Cause:** a plugin's options object wasn't wrapped in `[ ]` together with the plugin's name, so Expo read it as a plugin with no name.
- **Fix:** write it as one entry: `["plugin-name", { …options }]`.

### 17. Audio peaked and sounded crunchy
- **Cause:** live synthesis on the phone (react-native-audio-api). There were clicks at note starts, a soft limiter that added distortion, and the phone speaker distorting. Several tweaks helped, but none removed it completely.
- **Fix:** switched to chords pre-rendered as WAV files on the PC and played with `expo-audio`. The crunch went away.
- **Lesson:** on phones, playing pre-made audio files is far more reliable than generating sound live.

### 18. "Cannot read property 'ErrorBoundary' of undefined"
- **Cause:** Fast Refresh reloaded while several files were half-changed and didn't match each other.
- **Fix:** a full reload (press `r`).

### 19. Tapping a Dark orb played the major chord
- **Cause:** the swipe gesture is built once, so it kept calling the first render's callbacks, which had the old Bright/Dark mode.
- **Fix:** read the latest state and callbacks through refs.

### 20. Synthesised instruments sounded artificial
- **Cause:** the instruments were synthesised voices.
- **Fix:** recorded samples instead: Salamander Grand Piano (credit required) and VSCO-2-CE for violin, harp, flute and the glockenspiel chimes.

### 21. `npm run render:chords` failed with `rmSync` is not defined
- **Cause:** the script's import line was still the old one.
- **Fix:** `import { mkdirSync, rmSync, writeFileSync } from "node:fs";`

### 22. `saveCheckin`: string not assignable to the instrument type
- **Cause:** the call still passed `reflection` where the new instrument argument goes.
- **Fix:** `saveCheckin(selected, mode, instrument, reflection)`.

### 23. Cello, flute and glockenspiel samples were an octave off
- **Cause:** those VSCO files are labelled one octave lower than they really sound.
- **Fix:** an `octave: 1` correction in `scripts/samples.mjs`.

### 24. The piano played over the other instruments
- **Cause:** a leftover line in `OrbCarousel`'s `settle` called the first render's callback, which still had piano as the instrument.
- **Fix:** delete the extra `onFocusChange(index)` line.

---

## Stage 6: Harmony engine (the AI)

### 25. The training script wouldn't run under `node --experimental-strip-types`
- **Cause:** Node's type stripping can't handle `private` constructor parameter properties.
- **Fix:** use plain class fields in the Adam optimiser.

---

## Stage 7: Weekly

### 26. EAS prebuild failed ("exited with non-zero code: 1")
- **Cause:** the six icon and splash images had been deleted, but `app.json` points to them.
- **Fix:** restore them from git (`git checkout 8ca4a25 -- assets/…`), then replace them with the new glowing-orb icons.
- **Lesson:** files that `app.json` points to must always exist.

### 27. Disc art previews failed in Node
- **Cause:** CanvasKit (Skia for Node) needs `PathBuilder` rather than `Path`, and Jest's test environment broke CanvasKit.
- **Fix:** use `PathBuilder`, and run the previews with a plain Node loader instead of Jest.

### 28. "Maximum update depth exceeded" on Weekly
- **Cause:** the song position was copied into state inside an effect, which re-rendered on every player update.
- **Fix:** work the position out during render instead.

### 29. "This week couldn't be loaded" with no connection
- **Cause:** check-ins were only read from Firestore.
- **Fix:** offline-first storage. Sealed records are kept on the phone and uploaded to Firestore in the background.

### 30. A harsh square edge cut off the disc's glow
- **Cause:** the glow was bigger than its canvas, so it got clipped.
- **Fix:** a bigger canvas and a radial-gradient glow.

### 31. The play button did nothing
- **Cause:** with `playsInSilentMode: false`, Android ignores `play()` while the phone is on vibrate or silent. The first fix was also pasted into the wrong place.
- **Fix:** `playsInSilentMode: true` in `ensureAudioMode()` (`src/audio/index.ts`), called once at launch in `app/_layout.tsx`.

### 32. The forward button stopped working after the first jump
- **Cause:** the player rounds to whole milliseconds, so after a jump it reports a time a fraction before the bar line and thinks it's still on the previous day.
- **Fix:** `BAR_LINE_TOLERANCE` (0.05 s) in `barAt`, plus a regression test.

### 33. `SongDisc.tsx` colour error (`500` used on a colour that only has `300` and `700`)
- **Cause:** a missing colour shade.
- **Fix:** resolved. `npx tsc` is clean as of 5 October.

### 34. "File name differs from … only in casing" (`songActions.tsx` vs `SongActions`)
- **Cause:** the file was saved with a lowercase `s`. Windows ignores case, but TypeScript doesn't.
- **Fix:** rename through a temporary name, because Windows won't rename only the capitals in one step.

### 35. `npx expo run:android`: Android SDK and `adb` not found
- **Cause:** that command builds on the laptop, which needs Android Studio's SDK. This project builds in the cloud with EAS. The command also created an `android/` folder and changed the `android`/`ios` scripts in `package.json`.
- **Fix:** delete `android/`, run `git checkout package.json`, and use `npx eas-cli@latest build --profile development --platform android`.

### 36. Couldn't attach a message to a shared song
- **Cause:** neither `expo-sharing` nor React Native's own `Share` can send text together with a file on Android.
- **Fix:** switched to `react-native-share` (no extra permissions, no tracking) and removed `expo-sharing`.

### 37. "'RNShare' could not be found" crash when opening Weekly
- **Cause:** a library with native code was added, but the development build on the phone was older than it.
- **Fix:** a new EAS development build.
- **Lesson:** any library with native code needs a new build; JavaScript-only changes just need `r`.

### 38. `useComposingMoment`: `"composing"` not assignable to the chime type
- **Cause:** the `composing` line had been deleted from `chords.generated.ts`, which is a generated file.
- **Fix:** the moment now uses the `composed` chime.

### 39. The composing moment stopped appearing
- **Cause:** not a bug. It only shows once per version of the week (after each new check-in), and that version had already been marked as seen.
- **Fix:** a development-only **Replay composing** chip that clears the "seen" mark.

### 40. Test files named differently from the files they test
- **Cause:** `localPlaylist.test.ts` and `playlistSong.test.ts` are singular, but the files they test are plural.
- **Fix:** they still run. Rename them to match (`localPlaylists.test.ts`, `playlistSongs.test.ts`) to keep the convention.

### 41. The Playlists screen didn't open
- **Cause:** `index.tsx` and `[id].tsx` were put in `src/features/playlists/`. Expo Router only finds screens in `app/`.
- **Fix:** move them to `app/playlists/`. In PowerShell, `[id]` needs `-LiteralPath`, because the brackets are otherwise read as a wildcard.

### 42. The week's dates disappeared from the Weekly header
- **Cause:** the whole header was replaced instead of just the title line.
- **Fix:** restore the full header: title with the playlist icon, the date range, and the development-only chips.

### 43. The playlist icon crowded the Weekly title on narrow phones
- **Cause:** the icon was pinned to the right edge, so a long title could run into it.
- **Fix:** put the title and icon in a row with a fixed `gap-4`.
