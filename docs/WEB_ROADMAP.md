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
  - Sharing: web versions of the share, PDF and file code (phase 3)
  - Notifications, printing, the file system and haptics load without crashing; their web behaviour is phases 2 and 3
- [x] Every tab and screen opens without an error
- [x] A check-in saves, encrypted, and uploads to Firestore from the browser

Run it with `node scripts/web.mjs` (or `node scripts/web.mjs build` to export it to `dist/`). These commands aren't in `package.json` on purpose: see problem 63.

## Phase 2: Sound

- [x] Orb chords and chimes play in the browser
- [x] Songs are mixed in the browser and played from memory instead of a file on the phone (`song.web.ts`)
- [ ] Unlock sound on the first tap: works in Chrome, where the first swipe or tap counts; check iPhone Safari, which is stricter, in phase 6
- [x] Each instrument's sounds load only when they're first needed, so the first visit stays quick
- [x] Weekly and monthly songs, the Composer, calming sounds (looping) and the breathing chimes all play; playlists use the same song code and get a full run-through in phase 6

## Phase 3: Features that work differently

- [x] **Export as PDF** (sheet music and Export data) opens the browser's print dialog, ready to "Save as PDF"
- [x] **Share a song** uses the browser's share menu on phones, and downloads the file on laptops (the download is checked; the phone share menu is checked in phase 6)
- [x] **Back up, restore and MusicXML** become a download and a file picker. Save a song stays Android-only: in the browser, Share already downloads it or offers "Save to Files"
- [x] **Daily reminder** is hidden, because browsers can't schedule it
- [x] **Feel notes** is hidden, because iPhone browsers can't vibrate (in Settings and on the intro's last page)
- [x] A short note in Settings says these two are on the Android app
- [x] Arrow keys move the orb carousel on a laptop, alongside click-and-drag, and Enter chooses the orb
- [x] Messages and confirmations show in the browser (react-native-web's `Alert.alert` does nothing; problem 66)

## Phase 4: The phone frame

- [x] On a laptop or tablet (700 px wide or more), the app runs inside a phone-sized frame (an iframe of the same address), so its layout is exactly the phone's (`src/web/phoneFrame.ts`)
- [x] The frame scales to fit shorter screens and keeps the phone's proportions
- [x] The page around it uses Sonata's night sky, with rounded screen edges and no drawn phone parts
- [x] Beside the frame:
  - The Sonata name and a line about the browser version
  - "Get the Android app", linking to the Google Drive folder with the APK
  - A QR code of the site's own address, to open it on a phone (hidden below 900 px wide)
- [x] On a phone, the frame is skipped and the app fills the screen
- [x] The arrow keys reach the app as soon as the frame loads

## Phase 5: Feels like an app

- [x] A web app manifest: name, icons, night-sky colours, standalone display (`public/manifest.webmanifest`)
- [x] An Apple touch icon and status-bar colours for iPhone (`public/index.html`, Expo's page template)
- [ ] "Add to Home Screen" gives Sonata its own icon and opens it without the browser bar: check on a real phone in phase 6
- [x] The browser's theme colour matches the night sky
- No service worker: installing no longer needs one, and without it a new version shows up on the next visit

## Phase 6: Test

- [x] Laptop, Chromium (the production build at 1280×720, 1366×768 and tablet size): frame, intro, check-in, arrow keys
- [ ] Laptop: Firefox and Safari
- [ ] Phones: Android Chrome and iPhone Safari, in the browser and added to the home screen; sound on the first tap in iPhone Safari; the share menu for a song
- [ ] Full run-through on the published site: check in, the week's song, the month, the Oasis, the Composer, sheet music, a backup and a restore, sample months
- [ ] Graphics run smoothly on an ordinary laptop
- [x] Type-check, lint and every test still pass, and the Android fingerprint is unchanged (`2a28173…`), so the installed app still updates
- [ ] Problems found go into `docs/PROBLEM_LOG.md`

## Phase 7: Publish

- [ ] Host for free on Vercel: `vercel.json` builds with `node scripts/web.mjs build` and serves `dist/`, sending every address to the app
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
