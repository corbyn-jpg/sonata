# Sonata on the web: roadmap

A free way for external moderators to try Sonata without an Android phone: the same app, built for the browser with Expo's web support, shown in a phone-sized window on laptops and full-screen on phones, and hosted for free.

The Android app stays the main version. Nothing here changes how it works.

## Phase 1: Run in the browser

Get the app opening and navigating in a browser, even if some features don't work yet.

- [x] Install the web packages (`react-native-web` and `@expo/metro-runtime`)
- [x] Load Skia's web engine (CanvasKit) before the app draws, so the orbs, sky and records render (`index.web.js`)
- [x] Check NativeWind styles and the fonts on the web
- [x] Stop phone-only modules crashing on import:
  - Secure storage: the encryption key uses browser storage (`keyStore.web.ts`)
  - Sign-in: Firebase keeps it in browser storage (`authPersistence.web.ts`)
  - Sharing: `@/lib/share`, a placeholder on the web until phase 3
  - Notifications, printing, the file system and haptics load without crashing; their web behaviour is phases 2 and 3
- [x] Every tab and screen opens without an error
- [x] A check-in saves, encrypted, and uploads to Firestore from the browser

Run it with `node scripts/web.mjs` (or `node scripts/web.mjs build` to export it to `dist/`). These commands aren't in `package.json` on purpose: see problem 63.

## Phase 2: Sound

- [ ] Orb chords and chimes play in the browser
- [ ] Songs are mixed in the browser and played from memory instead of a file on the phone
- [ ] Unlock sound on the first tap, since browsers block it until then
- [ ] Each instrument's sounds load only when they're first needed, so the first visit stays quick
- [ ] Weekly and monthly songs, the Composer, playlists, calming sounds and the breathing chimes all play

## Phase 3: Features that work differently

- [ ] **Export as PDF** (sheet music and Export data) opens the browser's print dialog, ready to "Save as PDF"
- [ ] **Share a song** uses the browser's share menu on phones, and downloads the file on laptops
- [ ] **Save a song, back up, restore** become a download and a file picker
- [ ] **Daily reminder** is hidden, because browsers can't schedule it
- [ ] **Feel notes** is hidden, because iPhone browsers can't vibrate
- [ ] A short note in Settings says these two are on the Android app
- [ ] Arrow keys move the orb carousel on a laptop, alongside click-and-drag

## Phase 4: The phone frame

- [ ] On a laptop or tablet, the app runs inside a phone-sized frame (an iframe), so its layout is exactly the phone's
- [ ] The frame scales to fit shorter screens and keeps the phone's proportions
- [ ] The page around it uses Sonata's night sky, with rounded screen edges and no drawn phone parts
- [ ] Beside the frame:
  - The Sonata name
  - "Best on the Android app", linking to the APK
  - A QR code to open it on a phone
- [ ] On a phone, the frame is skipped and the app fills the screen

## Phase 5: Feels like an app

- [ ] A web app manifest: name, icons, night-sky colours, full-screen display
- [ ] An Apple touch icon and status-bar colours for iPhone
- [ ] "Add to Home Screen" gives Sonata its own icon and opens it without the browser bar
- [ ] The browser's theme colour matches the night sky

## Phase 6: Test

- [ ] Laptop: Chrome, Edge, Firefox and Safari, at large and small window sizes
- [ ] Phones: Android Chrome and iPhone Safari, in the browser and added to the home screen
- [ ] Full run-through: check in, the week's song, the month, the Oasis, the Composer, sheet music, a backup and a restore, sample months
- [ ] Graphics run smoothly on an ordinary laptop
- [ ] Type-check, lint and every test still pass, and the Android app still builds and updates
- [ ] Problems found go into `docs/PROBLEM_LOG.md`

## Phase 7: Publish

- [ ] Host for free: Vercel (simplest) or GitHub Pages
- [ ] Give it a clear address, such as `sonata-….vercel.app`
- [ ] Add a "Try it in your browser" link to the README and the hand-in
- [ ] Keep the walkthrough video linked as a backup

## Risks to watch

| Risk | Plan |
|---|---|
| Skia's web engine is heavy, and glows may lag on an old laptop | Test early in Phase 1; fewer stars or softer blur on the web if needed |
| About 47 MB of sounds in total | Load per instrument on demand, and cache them in the browser |
| Safari handles sound and storage differently | Test on a real iPhone in Phase 6 |
| Clearing the browser's data wipes check-ins | Moderators can add sample months again in one tap |
| The encryption key sits in browser storage, which is less protected than the phone's secure storage | Say so in the web version's About; the Android app keeps the stronger setup |
