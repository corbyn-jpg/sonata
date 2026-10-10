# Sonata problem log

Every problem hit while building Sonata: what we saw, why it happened and how it was fixed. Grouped by build stage (CLAUDE.md §8), oldest first. New problems are added as they come up.

Each entry has:

- **Seen:** what showed up
- **Cause:** why it happened
- **Fix:** how it was solved
- **Lesson:** where there's something to remember for next time

---

## Open problems

- None. The clean-up pass (problems 44–46) brings `npx expo lint` to 0 problems once applied.

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

---

## Clean-up pass (after stage 7)

### 44. 22 React Compiler lint errors ("This value cannot be modified", "Cannot access refs during render", "setState in an effect")
- **Cause:** three patterns the React 19 hook rules reject:
  - Writing Reanimated shared values with `.value = …` in component code.
  - The "latest ref" trick (`ref.current = prop` during render) used so gestures built once in `useMemo` could call fresh callbacks.
  - Resetting state at the start of an effect (`setFailed(false)`, `setRevealing(false)`).
- **Fix:**
  - Shared values use `.get()` and `.set()`, Reanimated's React Compiler-safe API.
  - Gestures are rebuilt on each render instead of memoised, so they capture the current callbacks directly and the refs go.
  - State that was reset in an effect is worked out during render instead: a failure is keyed by song and instrument, and the composing moment is `{ key, waited }`, finished when the song is ready.
- **Lesson:** if a value can be derived from props or state, derive it; don't copy it into state or a ref.

### 45. Skia warnings: `SkPath.moveTo()` / `lineTo()` / `addArc()` / `addCircle()` / `cubicTo()` are deprecated
- **Cause:** paths were built by mutating `Skia.Path.Make()`. Skia 2.6 moves building to `Skia.PathBuilder`.
- **Fix:** `Skia.PathBuilder.Make()…build()` in `SongDisc`, `OrbitTransport`, `ComposingMoment` and the disc painter; `Skia.Path.Circle()` for the disc's clip.

### 46. Smaller lint warnings
- **Cause:** unused imports and variables (`View`, `streak`), the Weekly development chips missing from the header (so `DEMO_NAMES`, `setDemo` and `replay` were unused), a tab icon defined as an anonymous component, and `require()` in two test files.
- **Fix:** removed the unused names, restored the development chips, named the tab icon component, imported the AsyncStorage mock instead of requiring it, and renamed two test files to match the files they test.

---

## Stage 8: Monthly

### 47. "Cannot find module '@/components/BentoCard'" and "Cannot find name 'shortDate'"
- **Cause:** the new files were saved as `BentoCards.tsx`, `MonthlyBento.tsx` and `ValenceCharts.tsx`, but the code imports `BentoCard`, `MonthBento` and `ValenceChart`. The test also used `shortDate` without importing it, and `monthly.tsx` hadn't been updated yet.
- **Fix:** renamed the three files to match their imports, added `shortDate` to the test's import, and finished the `monthly.tsx` changes. Also moved `"private": true` to the top level of `package.json`, which stopped Jest's "Unknown option" warning.
- **Lesson:** a file's name must match its import exactly (see also problem 34).

### 48. "105 passed" when there should have been 110
- **Cause:** in `localPlaylists.test.ts` the mock import sat below the `./localPlaylists` import, so AsyncStorage loaded before the mock existed and the whole file crashed. Jest's summary counts tests, not files that failed to load, so it still said "passed".
- **Fix:** made the mock import the first line of the file.
- **Lesson:** check the "Test Suites" line as well as "Tests".

---

## Stage 9: Grounding Oasis

### 49. "Type '(Awaited<Opened<Content>> | null)[]' is not assignable" in `sealedCollection.ts`
- **Cause:** when the playlist store became the generic `sealedCollection<Content>`, the decrypt step returned `record | null` and then filtered out the nulls with a type guard. Once `Content` is a generic type, TypeScript can't prove that `Awaited<Opened<Content>>` is the same as `Opened<Content>`, so the type guard is rejected.
- **Fix:** push each record that opens into an `Opened<Content>[]` array and skip the ones that don't, so there are no nulls to filter.
- **Lesson:** in generic code, collect results directly rather than returning `null` and filtering afterwards.

### 50. Parts of the app looked AI-generated (Hallmark design audit)
- **Seen:** every bento card had the same two-tone corner glow; the Oasis cards were an icon in a tile above a heading; the Monthly bento was three matching stat tiles; the tab bar was the stock edge-to-edge bar, not the capsule from the mockups; removing a playlist song asked "Are you sure?"; Home showed "Check-in saved" when the button already said so; "COMPOSING" was a spaced-out uppercase label; the Save button used pure white.
- **Cause:** each was a default pattern (the template card, the KPI row, the stock tab bar, the confirm dialog) rather than a choice made for Sonata. The glow colours were picked per card, so they meant nothing.
- **Fix:** `BentoCard`'s glow is optional and kept only where the colours mean something; the Oasis became a bento where size follows content, with helplines as a plain link below it; the Monthly bento is one card with the chart and a line of figures; `CapsuleTabBar` draws the floating capsule; removing a song happens straight away with a 5 s Undo (`restoreSong`, `withSongAt`); success is silent (announced to screen readers); "Composing…" in sentence case; `text-primary` instead of white. CLAUDE.md §5, §6 and §12 updated, and its colour tokens now match `colours.js`.
- **Lesson:** a decoration on every card means nothing on any of them. Before reaching for a familiar pattern, check the content asks for it.

### 51. "Cannot find native module 'ExpoPrint'" and "Route ./sheet-music.tsx is missing the required default export"
- **Seen:** opening Sheet music crashed the screen after `expo-print` was installed, before a new development build was on the phone (the EAS upload had failed).
- **Cause:** `expo-print` looks up its native module the moment it's imported. `exportScore.ts` imported it at the top, so loading the screen threw on a build without the module, and Expo Router then reported the route as having no default export.
- **Fix:** `sharePdf` checks `requireOptionalNativeModule("ExpoPrint")` first and only then loads `expo-print` with `await import(...)`. On an older build, Export PDF says the new build is needed; the score and MusicXML export still work.
- **Lesson:** a new native module can't run until the development build is rebuilt. Import it where it's used, behind a check, so the rest of the screen keeps working in the meantime.

## Stage 10: Composer, Settings, onboarding

### 52. Bottom sheets sat under the Android navigation bar
- **Seen:** on a Samsung with the three-button bar (back, home, recent apps), the last button in most bottom sheets (Cancel, Not now, the bottom instrument) sat partly under the bar.
- **Cause:** Android draws Sonata edge to edge, under the navigation bar, and every sheet had a fixed `pb-12` (48 px) at the bottom. The bar's height differs between phones and between gesture and button navigation, so a fixed number is too little on some. Each sheet also built its own `Modal`, so the fix (and the backdrop, animation and keyboard handling) had drifted between seven copies.
- **Fix:** one shared `src/components/BottomSheet.tsx`. Its `Modal` is always edge to edge (`statusBarTranslucent`, `navigationBarTranslucent`), and its bottom padding is the bar's real height from `useSafeAreaInsets()` plus 24 px. All seven sheets use it (instrument picker, low-mood offer, share, add to playlist, song picker, reminder time, delete all data), with one backdrop and one fade; `avoidKeyboard` lifts the ones with a text box.
- **Lesson:** never pad for system bars with a fixed number; read the insets. And when the same piece of UI is copied a third time, make it a component so a fix lands everywhere at once.

## Stage 11: Audit

### 53. Contrast just under the minimum, and permissions the app never uses
- **Seen:** the stage 11 audit measured white text on the teal buttons ("Grounding ritual") at 4.49:1, a hair under WCAG AA's 4.5:1; text-box outlines at 1.79:1, under the 3:1 a control's edge needs (WCAG 1.4.11); and the build asking for "draw over other apps", storage read/write and microphone permissions. Two icon tiles (playlists list, low-mood sheet) were left over from before the Hallmark audit, and the sheet backdrop's "Close" had no button role.
- **Cause:** the teal and border tokens were chosen by eye on a dark screen; the hairline `border` colour was reused for text boxes, where it has a different job. Expo and its libraries add those permissions by default, whether or not the app uses them.
- **Fix:** `teal-700` darkened from `#0B7A6E` to `#0A766A` (4.74:1); a new `field` token `#76628F` (at least 3:1 on every surface) for text-box outlines, cards keep the hairline; `android.blockedPermissions` in `app.json` removes the four permissions (confirmed with `npx expo config --type introspect`; takes effect from the next EAS build); icons sit in line with their text; the backdrop has `accessibilityRole="button"`. Also removed a duplicate `expo-splash-screen` plugin entry.
- **Lesson:** measure contrast instead of judging it on screen, and check a colour against what it's used for (text, an outline, a divider each need different ratios). Read the final manifest rather than trusting `app.json` alone: libraries add permissions of their own.

### 54. "<Canvas onLayout={onLayout} /> is not supported on the new architecture"
- **Seen:** Weekly (and every screen with the sky) showed this error straight after the sky was given a fade above the tab bar.
- **Cause:** the fade needs the sky's visible height, and it was measured with `onLayout` on Skia's `<Canvas>`. On React Native's New Architecture, Skia's Canvas doesn't take `onLayout`.
- **Fix:** the Canvas sits inside a plain `View` (absolute fill, `pointerEvents="none"`), and the View measures the height instead.
- **Lesson:** a Skia Canvas isn't an ordinary View. To size something to a canvas, measure a View around it (or use Skia's own `onSize`).
