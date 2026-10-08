@AGENTS.md

# Sonata — Project Specification

Mobile wellness app that turns daily mood check-ins into AI-generated weekly musical
compositions. Built for DV 300 (Open Window). Solo developer project.

**Tagline:** Transforming your daily emotional spectrum into personalised melodies.

---

## 0. Working with me

- **I type the code myself.** Show code in chat and I write it into VS Code. Only create or edit
  project files when I explicitly ask.
- **Be concise.** I know React Native, Expo and TypeScript — no tutorials or explanations of
  basics. Code plus short notes on anything non-obvious or project-specific.
- **Always give full file paths from the project root**, and flag any new folder I need to create.
- **British English** for our own identifiers, comments, file names and UI copy (`colour`,
  `centre`, `personalised`, `colours.js`). Library APIs keep their own spelling (`color`,
  `backgroundColor`, `alignItems: 'center'`, `text-center`). Rename on destructure when needed:
  `({ color: colour }) => …`.
- **Environment:** Windows + PowerShell. `npx expo install pkg -- --flag` fails in PowerShell
  (the `npx.ps1` shim strips `--`) — use `npx.cmd`, or plain `npm i -D pkg@<sdk-matched-version>`.

---

## 1. Core concept

The user picks one glowing orb per day. Each orb maps internally to a diatonic note and a
mode (major/minor). After seven days, an on-device symbolic AI engine harmonises those seven
notes into a 7-bar melody with generated cover artwork. The user can play it, archive it, and
compare weeks over time.

**The non-negotiable premise:** the user never sees note letters or emotion words while
picking. They choose by colour and sound. Emotion labels exist only internally (for the harmony
engine), never in the UI. Putting a word on the orb boxes the feeling in and defeats the product.
(§12: orbs now show their note letter, and there is no grid view.)

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | React Native + TypeScript, Expo | Expo managed workflow with a **development build** (`expo-dev-client`) — Expo Go can't load the native audio module |
| Styling | NativeWind (Tailwind for RN) | Design tokens in `tailwind.config.js` |
| Animation | React Native Reanimated 4 | All ambient motion runs on the UI thread. Shared values use `.get()` / `.set()` (React Compiler lint rules) |
| Graphics | `@shopify/react-native-skia` 2.6 | Every glow, orb, wash, disc and chart. Build paths with `Skia.PathBuilder` (the mutating `SkPath` methods are deprecated) |
| Audio | `expo-audio` + pre-rendered WAVs from recorded samples | Chords and chimes rendered offline by a script; songs mixed to a WAV in JS on the phone. No live synthesis (§12) |
| Sharing | `react-native-share` | Shares a file **and** a message together on Android (`expo-sharing` can't). Needs a development build |
| PDF | `expo-print` | Sheet music to PDF from the score's SVG (§11). Native: needs a development build |
| Local storage | AsyncStorage (sealed records) | Offline-first: check-ins and playlists are saved on the phone first, uploaded in the background (§12) |
| Database | Firebase Cloud Firestore | Firebase JS SDK (`firebase` package, modular imports only) |
| Auth | Firebase Anonymous Auth | `firebase/auth` with `getReactNativePersistence(AsyncStorage)` so the anonymous UID survives restarts — no email, no PII |
| Encryption | AES-256-GCM client-side | `@noble/ciphers` (`gcm`) for encryption · `expo-crypto` `getRandomBytes` for keys and 12-byte IVs · `expo-secure-store` for the key. **Not `crypto-js`** — it has no GCM mode |
| Version control | Git + GitHub | Commit straight to `main` (solo project) |
| Testing | Jest | Harmony engine + valence logic are the priority |
| AI | Markov chain + GRU neural network, trained on Bach chorales by our own TypeScript trainer | On-device inference only (§7) |

**Versions:** Expo SDK 57 · React Native 0.86 · React 19.2.3 (keep `react-dom` pinned to the same
exact version) · TypeScript 6 · NativeWind 4 (Tailwind **3**, not 4) · Reanimated 4 (needs
`react-native-worklets`) · Expo Router. Icons: `lucide-react-native` (`strokeWidth={1.5}`).

### Critical architectural rule
**All sensitive payloads are encrypted on-device before any Firestore write.** Firestore
stores unreadable ciphertext plus a plaintext integer `valence_score` used only for indexing
and trend queries. The encryption key is generated on-device and never transmitted. Firebase
Security Rules validate document *shape* only; they never need payload access.

```ts
// every write follows this shape: sealed on the phone, stored locally, then uploaded
await setDoc(doc(checkins, id), {   // id made on the phone, so a record keeps one id everywhere
  user_id,                  // plaintext — Firebase Anonymous UID
  encrypted_payload,        // AES-256-GCM ciphertext
  initialization_vector_iv, // per-record IV
  valence_score,            // plaintext int 1-10, for indexing only
  timestamp,
});
```

---

## 3. Data model

Firestore collections (mirrors the ERD in the pitch document):

```
USERS
  user_id                   string  PK   — Firebase Anonymous Auth UID
  public_key_hash           string
  created_at                datetime
  notifications_enabled     boolean

DAILY_CHECKINS
  checkin_id                string  PK
  user_id                   string  FK
  encrypted_payload         string       — note, mode, emotion, reflection text
  initialization_vector_iv  string
  valence_score             int          — plaintext, indexing only
  timestamp                 datetime

WEEKLY_MELODIES
  melody_id                 string  PK
  user_id                   string  FK
  primary_mode              string       — Ionian | Dorian | Aeolian | Lydian
  midi_sequence_json        string
  average_valence           int
  week_start_date           datetime
  week_end_date             datetime

PLAYLISTS
  playlist_id               string  PK   — made on the phone
  user_id                   string  FK
  encrypted_payload         string       — name + songs (each song keeps the notes it was made from)
  initialization_vector_iv  string
  updated_at                datetime     — the newest version wins; deletes are uploaded too

CBT_THOUGHT_RECORDS
  record_id                 string  PK
  user_id                   string  FK
  encrypted_payload         string       — situation, NAT, distortion, reframe
  initialization_vector_iv  string
  timestamp                 datetime
```

Relationships: `USERS 1—∞ DAILY_CHECKINS` · `USERS 1—∞ WEEKLY_MELODIES` ·
`USERS 1—∞ CBT_THOUGHT_RECORDS` · `USERS 1—∞ PLAYLISTS` · `WEEKLY_MELODIES 1—7 DAILY_CHECKINS`

**In practice, songs aren't stored.** The engine is deterministic, so a week's (or month's) song is
recomposed on the phone from its check-ins whenever it's needed, and its audio is cached as a WAV
named by a hash of its notes. `WEEKLY_MELODIES` stays in the ERD for the pitch document. Firestore
security rules for `daily_checkins`, `playlists` and `cbt_thought_records` check ownership and
document shape only.

---

## 4. Note / emotion mapping

Seven diatonic notes × two modes = 14 emotional states. **Internal only** — never rendered in
the carousel. Each orb is a two-colour radial gradient (core → edge); never blend 3+ hues,
it produces muddy brown-grey.

| Note | Bright (major) | core → edge | Dark (minor) | core → edge |
|---|---|---|---|---|
| C | Calm | `#5EA8E8` → `#A8D8F0` | Empty / numb | `#3E6B87` → `#2B4A5E` |
| D | Content | `#3FC2AC` → `#8FE3C8` | Lonely | `#2C6F63` → `#1E4F47` |
| E | Joyful | `#F2B33D` → `#F7D98A` | Bittersweet | `#9C7A3E` → `#6E552B` |
| F | Grateful | `#6FBF73` → `#B3E0A8` | Disappointed | `#4C7A4F` → `#355738` |
| G | Curious | `#8B8981` → `#C4C2B6` | Confused | `#5F5D57` → `#42413C` |
| A | Excited | `#E8785A` → `#F5B08F` | Anxious | `#9C5644` → `#6E3C30` |
| B | Proud | `#A98CF0` → `#D4BFF8` | Angry / frustrated | `#6E5B99` → `#4D406B` |

Pairs sit in the same emotional family at opposite valence (Excited/Anxious are both
high-arousal; Curious/Confused are both unsettled-seeking).

### Pitch rule: Dark = minor
The Bright page uses C major. The Dark page uses the **same letter in C natural minor**
(Aeolian), which lowers the 3rd, 6th and 7th:

| Orb | C | D | E | F | G | A | B |
|---|---|---|---|---|---|---|---|
| Bright pitch | C | D | E | F | G | A | B |
| Dark pitch | C | D | **E♭** | F | G | **A♭** | **B♭** |

C, D, F and G keep their pitch on the Dark page but still carry `mode: 'minor'`, so the
harmony engine voices them with minor-mode chords. Every check-in stores both the pitch
and the mode; the engine never works out the mode from the pitch alone.

---

## 5. Design system

### Colour tokens
```
bg-canvas          #060011   app background (violet-black, never neutral grey)
bg-surface         #15052A   cards, sheets
bg-surface-raised  #2A1642   modals, elevated cards, the current tab
border             #493461   dividers, input borders
text-primary       #f3ebfa
text-secondary     #c2bfd6
text-muted         #9f9ead   16px+ only

violet-200         #C9BFFB   accent text on dark
violet-500         #8B5CF6   icons, outlines
violet-700         #5B34B8   primary button fill (white text)
teal-300           #7EE4CE   positive accent text
teal-700           #0B7A6E   secondary button fill (white text)
```

### Typography
- **Headers:** DM Mono (max weight Medium — no Bold exists in this family)
- **Body:** Roboto — Medium for long-form copy and CBT records, Bold for titles/labels
- Base 16px, scale ×1.25 (major third): `13 / 16 / 20 / 25 / 31 / 39`
- H1 39 (onboarding only) · H2 31 (screen titles) · H3 25 · H4 20 · Body 16 · Caption 13
- Line height 1.6 body / 1.3 headers

### Spacing & shape
8px grid · 24px screen margins · 16px between related elements · 32px between sections ·
cards 16px radius, 20px padding · buttons pill 28px radius, 52px min height ·
icons 1.5px stroke, outline only.

### The three signature visuals
1. **Glow orb** — bright concentrated core, wide blurred halo, faint outer aura. Firefly in a
   dark room. Two colours max. Construction: radial gradient fill + duplicate at 2× scale with
   60–80px blur at 40% opacity + optional 3× ring at 100px blur, 15% opacity.
2. **Responsive atmosphere** — the whole screen background shifts to match the focused orb's
   colours. Swiping crossfades it (600–800ms). This is the single biggest thing that makes the
   app feel alive; do not skip it.
3. **Orbital layering** — faint stars, drifting particles, thin elliptical orbit paths at
   5–10% opacity. Home, Weekly, Onboarding only. Never on functional screens.

### Motion
Discrete transitions 300–400ms ease-out. Ambient drift on 60–90s loops, `transform`/`opacity`
only, running through Reanimated on the UI thread. Must respect `prefers-reduced-motion`.

### Accessibility
44×44pt minimum tap targets · visible focus states (2px violet-500, 2px offset) ·
4.5:1 contrast for body text (3:1 for 24px+/bold 19px+) · text on an orb uses off-white with a
soft dark halo behind it · **every orb needs an accessible screen-reader name even where no
visible label is shown** · layouts must survive one Dynamic Type step up.

---

## 6. Screens

### 1. Onboarding & Privacy Setup
Three swipeable slides, dot indicator, starfield behind. Each illustration is a themed glow
orb — single violet orb → cluster of 7 on an orbit path → cool teal orb with a faint lock
silhouette inside the bloom. CTA "Get started". Background atmosphere crossfades per slide.

### 2. Home / Daily Canvas  ← core screen, build first
- Header: time-aware greeting, streak pill, settings gear, composer entry
- **Major | Minor** toggle (shown to users as "Major" and "Minor" with note icons, §12; still
  called the Bright/Dark page in code). Bright = warmer washes, brighter cores, faster drift.
  Dark = cooler, dimmer, slower. Crossfades between them, never snaps.
- **Carousel** (the only view; there is no grid view, §12): centred orb ~150pt at full glow, its
  note letter below. Adjacent orbs at the screen edges, ~60% scale, heavily blurred, ~35%
  opacity. Horizontal swipe. Whole-screen atmosphere follows the centred orb. Tap centre to
  select (pulse-and-bloom).
- 7-day strip of glowing dots (today outlined if unlogged)
- Optional one-line text input — must never block saving
- "Save check-in" — violet-700 pill, muted until an orb is selected

**Target: complete in under 15 seconds.**

### 3. Weekly Melody Studio ✅
- Header: "Your week in sound" with a playlists icon beside it (opens `app/playlists/`), the
  week's dates underneath.
- Spinning disc ~230pt, one turn per ~40s while playing, eases to a stop on pause (still with
  Reduce Motion). Its face is a **generated space scene chosen by the week's mode** (Ionian solar
  system · Lydian aurora · Dorian comets · Aeolian eclipse), each day a planet, ribbon, comet or
  ray in its orb's colours. Small dark centre hole.
- Circular progress ring traces the disc edge; drag on it to seek.
- **Ringed-planet transport** (`OrbitTransport`): play/pause is a planet in the week's main
  colour, back/forward a day are moons at the ends of a tilted ring in the second colour. Still,
  not animated, so the spinning disc stays the focus. Replaces the wavy capsule (§12).
- Instrument pills: Piano · Violin · Harp · Flute. Changing instrument carries on from the same moment.
- 7 day chips: day letter, a dot in the orb's colour and the note name (no emotion words). Tap
  to play from that day.
- Song actions: **Share** (with an optional message), **Save** (Android: to a folder the user
  picks) and **Playlist** (§11).
- **Composing moment:** shown once for each new version of the week (after every check-in),
  for at least 3 s: "Composing…" over a staff where the week's notes arrive Monday to Sunday and
  a fine line traces the melody, then "Your week, as one melody". Wind chimes while it lasts; a
  glockenspiel chime and success haptic when the song is ready.
- Low-mood offer (Flow D, §7) as a bottom sheet, a moment after the song settles.

### 4. Monthly Rhythm ✅
- Month title with ‹ › (future months disabled).
- Calendar: a logged day is a small glowing orb in its colours, a missed day a faint outline
  (neutral, not a failure), today a violet ring. One Skia canvas for all the dots.
- **Month card** (`MonthBento`, one card, no corner glow): "Week by week", the valence line with one
  glowing point per week and a gap for a week without check-ins; under it one line of three
  figures split by hairlines: most-used mode ("in 2 of 3 weeks"), streak (an earlier month shows
  days logged instead) and melodies. Not a row of matching stat tiles (§12).
- **Month's song card:** the monthly song (§7), with its own **moon-phases record**: one moon per
  week in that week's colours (fuller for a brighter week, a new moon for a week without
  check-ins), a bead per day round the rim, the month's two main colours in the centre. Made the
  first time it's played (a few seconds), then cached.
- **Weeks shelf:** a small record per week that starts in the month (its weekly disc art); tap to
  play its song, the next week follows on. Weeks without a song are dashed outlines.
- Only one song plays at a time across the app (`src/audio/turns.ts`).

### 5. Custom Composer  (reached from Home header, NOT the tab bar)
Functional screen — flat surfaces, no ambient washes, no starfield. Horizontal piano-roll grid,
7 note rows (letters *are* fine here — explicit music-making context), tap cells to place
notes. Bottom toolbar: instrument, tempo slider 60–160 BPM, play/stop, save. Keep sparse.

### 6. Grounding Oasis
**Bento grid where size follows content:** Breathing space is the big card (3/5 width) and shows
the exercise's own orb, resting; Thought record and Calming sounds are stacked beside it (2/5).
The bottom row mirrors it: Sheet music (2/5) and Support & helplines (3/5), so the rows interlock.
Every card's words sit at the bottom. No icon tiles and no corner glows (the orb is the only glow).

Sub-screens:
- **Breathing space** — large glow orb expanding/contracting on a slow rhythm, brightening as
  it expands. Phase label inside the orb with a dark halo behind the type. Progress ring.
  60 BPM entrainment. *This is the one place a word sits on an orb — it's an instruction, not a
  category.*
- **Thought record** ✅ — `app/thought-record/index.tsx` (past records, newest first; tap to open,
  Delete with a confirmation since it's permanent) and `new.tsx` (the form). Fields in plain words:
  "What happened?" / "What went through your mind?" (the only required one) / "Does it follow a
  pattern?" (chips from `PATTERNS` in `src/features/oasis/thoughts.ts`, one line explaining the
  chosen one, "Not sure" allowed) / "A kinder, more balanced thought". Each step is its own panel (question, hint and answer together; the answer box has a darker fill and no border of its own), 20px between panels, 500
  characters each. Encrypted and offline-first in `cbt_thought_records` (`src/lib/thoughtRecords.ts`).
- **Calming sounds** — track list; playing track shows a small spinning disc
- **Helplines** — name, one-line description, clear "Call" pill per row

### 7. Settings & Data Privacy  (reached from gear icon, NOT the tab bar)
Flat, no washes. Trust banner (lock icon, teal, one line on on-device encryption). Grouped
rows: Notifications (daily reminder, time) · Sound (default instrument, preview volume, sample
credits — §12) ·
Data (export PDF, backup encryption key) · Danger zone ("Delete all data" in muted red text
with outline trash icon — never a solid red button).

### Navigation
Bottom tab bar, 4 items: **Home · Weekly · Monthly · Oasis**, drawn by `CapsuleTabBar` as a
floating capsule inset 24px from the edges (surface fill, border), the current tab on a lighter
pill. Settings via gear. Composer via Home header. Maximum interaction depth: 2 taps.

---

## 7. The AI engine

On-device **neuro-symbolic AI**: machine-learned models guided by music theory rules. Explicitly
*not* a cloud LLM: no network calls, no third-party inference, no privacy exposure. This is the
product's core mechanic, not a feature. It also has to satisfy the DV 300 theme (machine learning,
deep learning, ethics of AI), so the AI must be demonstrable, measured and explainable.

| Part | Technique | Code |
|---|---|---|
| Mode evaluation | Rules (symbolic AI) | `src/engine/mode.ts` |
| Chords | **Markov chain learned from data** (major-key and minor-key odds) | `harmony.ts`, `model.ts` |
| Passing notes | **GRU recurrent neural network** (48 hidden units, ~16k weights) that samples each next interval; rules mask what it may pick (in the scale, in range, able to reach the next day's note) | `melody.ts`, `gru.ts`, `features.ts` |
| Cadence, Picardy third, voicing | Rules | `compose.ts`, `harmony.ts` |
| Monthly song links | Rules (harmony) + the same GRU (melody) | `month.ts` |

**Training** (`npm run train:model`, ~15 s, seeded so every run is identical):
- Data: **JSB Chorales** (382 four-part Bach chorales, train / validation / test split), kept outside
  the project in `../datasets/Jsb16thSeparated.json`. Bach is public domain, and the app ships only
  learned numbers, never the music. Credit it in Settings.
- `scripts/train/chorales.ts` finds each chorale's key (Krumhansl–Kessler profiles), moves it to C,
  and reads it as a chord progression (scale degrees per beat) and a soprano line.
- `scripts/train/backprop.ts` is the GRU's backpropagation through time, gradient clipping and Adam,
  **written from scratch in TypeScript** (no ML library; Python isn't used). `gru.test.ts`
  checks every gradient against finite differences.
- `scripts/train-model.ts` trains with early stopping on the validation set, evaluates on the test
  set against baselines, and writes `src/engine/model.generated.json` (weights, chord odds, scores,
  and a fixed example the app must reproduce exactly). Commit that JSON.
- `gru.ts` and `features.ts` have **no imports**, so Node runs the exact files the app runs. This
  needs `allowImportingTsExtensions` and `"types": ["jest", "node"]` in `tsconfig.json`.

Results on the 77 unseen test chorales (perplexity, lower is better): chords, hand-written rules
5.77 → learned 4.60; melody, Markov baseline 4.71 → GRU 2.43, with the top guess right 72% of the
time. The GRU also sees the harmony, which the baselines don't. Report that honestly.

**Ethics (part of the brief):** no personal data is used to train or leaves the phone, and the
training data is public domain. Low-mood detection only offers help and never diagnoses (below). An
AI *service* such as OpenAI is deliberately not used because it would break the zero-egress promise;
confirm with the lecturer that this is acceptable.

### Pipeline
```
Input: 7 daily notes (e.g. C4, Eb4, G4, Bb4, C5, Ab4, G4)
  1. Mode evaluation   → analyse note distribution, pick overarching mode
                         Ionian (bright/stable) · Lydian (ethereal) ·
                         Aeolian (melancholic) · Dorian (thoughtful)
  2. Harmonic framing  → map the 7 daily notes as anchor pitches across 7 bars
  3. Voice leading     → connect anchors with consonant passing tones and triads
  4. Picardy cadence   → if the week resolves from negative toward positive, end a
                         minor passage on a major tonic chord (reward prediction error)
Output: 7-bar note sequence (composeWeek → Composition: events, bars, tempo, mode, palette)
        + two-tone disc artwork, rendered to audio on the phone from the instrument samples
```

A missed day rests the melody while the chord holds. Every song ends on C, on the home chord.
Tempo = 60 + 4 × average valence (68–96 BPM). Brighter days get more, shorter notes.

### The monthly song (`composeMonth`)
Every week **that starts in the month** and has check-ins, in order, each **exactly as it sounds
on Weekly** (same notes, same seed). Between each pair, a one-bar **link** written by the engine:
the next week's home chord (so its mode is heard coming), then the dominant 7th of the chord that
week opens on (A minor is approached from E7); the GRU writes the link's melody from where one
week ended to a step from where the next begins. The song has one tempo (the weeks' mean) and
each part is stretched so every week keeps its own pace; links ease between neighbours. It plays
on the instrument used most across the month and grows as the month goes on.

### Edge case: dissonant input
Random selections (C, F#, Bb) could sound jarring. Apply diatonic transposition and harmonise
root notes with complementary major/minor 7th chords to preserve musicality.

### Low-mood detection
Flag **4 or more consecutive minor/dissonant entries within a 7-day window**. Computes moving
averages of valence. **Never produces a clinical diagnosis.**

"Consecutive" means consecutive **logged** entries. A missed day is skipped: it neither
breaks the run nor counts toward it. (Missed days can themselves be part of a low stretch,
so letting a gap reset the count would hide exactly the pattern this looks for.) The window
is the last 7 calendar days, so a run can't stretch further back than that.

Intervention (Flow D) — non-intrusive, opt-in only:
1. Quiet bottom sheet on the Weekly tab: *"Notice a heavy rhythm this week? Want a moment to
   ground yourself?"*
2. Tapping "Grounding Ritual" opens Breathing Space
3. Dismissing returns to Weekly with **no follow-up, no re-prompt, no logged refusal**

**Guardrails: no forced questionnaires, no psychiatric labels, no clinical pop-ups, no
diagnostic language.** The system offers; the user decides.

---

## 8. Build order

Work in this sequence — each stage produces something runnable.

1. **Foundation** ✅ — Expo + TypeScript scaffold as a development build (`expo-dev-client`), NativeWind with design tokens wired into
   `tailwind.config.js`, navigation shell with the 4 tabs, DM Mono + Roboto loaded
2. **Security layer** ✅ — Firebase Anonymous Auth, Firestore, the AES-256-GCM encrypt/decrypt
   wrapper. **Build and unit-test this before any real data flows through the app.**
3. **Glow orb component** ✅ — the reusable two-tone orb (core + halo + aura). Everything visual
   depends on this. Get it right before building screens around it.
4. **Home screen** ✅ — carousel, Bright/Dark toggle, responsive atmosphere, save flow
5. **Audio engine** ✅ — pre-rendered chords played with `expo-audio`, preview on selection,
   **instrument picker on Home**, **per-note vibration patterns** (§11)
6. **Harmony engine** ✅ — the AI (§7): rules + learned Markov chords + GRU melody, trained on
   Bach. Pure functions, heavily unit-tested, no UI dependencies.
7. **Weekly screen** ✅ — spinning disc, ringed-planet transport, generated artwork, composing
   moment, low-mood offer, **share / save**, **playlists** (§11)
8. **Monthly screen** ✅ — calendar, bento analytics, weeks shelf, **monthly song** with its
   moon-phases record (§7, §11)
9. **Grounding Oasis** — bento grid + 4 sub-screens, **sheet music from your songs** (§11)
10. **Composer, Settings, onboarding**
11. **Audit** — network proxy check for zero unencrypted egress, Jest coverage, a11y pass

---

## 9. Conventions

- **File structure:** `app/` holds routes only (every file is a screen). Settings and Composer
  live in `app/`, not `app/(tabs)/`. Everything else goes in `src/`: `components/`, `features/`
  (per area), `lib/firebase.ts`, `lib/crypto/`, `engine/` (pure TS, no React), `audio/`, `data/`,
  `theme/colours.js`. Import via the `@/` alias (`@/components/Screen`). Tests sit next to the
  file they test.
- **Styling:** raw hex values live only in `src/theme/colours.js`, which `tailwind.config.js`
  requires. Use Tailwind tokens (`bg-canvas`, `text-primary`, `text-h2`, `rounded-pill`,
  `font-sans-bold`). On RN each font weight is its own family — use `font-sans-bold`, never
  `font-sans font-bold`.

- **Screens only in `app/`.** A screen file under `src/` is never found by Expo Router (the
  playlists screens live in `app/playlists/`). File names must match their imports exactly,
  including capitals.
- **Before calling work done:** `npx tsc --noEmit`, `npx expo lint` (0 problems) and `npm test`.
  Check the "Test Suites" line too: a file that fails to load isn't counted in "Tests".
- **React Compiler lint rules:** no `ref.current` reads or writes during render, no
  `sharedValue.value =` in components (use `.get()` / `.set()`), no `setState` at the start of an
  effect. If a value can be worked out from props or state, work it out during render.
- Jest unit tests are mandatory for the harmony engine and valence calculations — these are
  pure logic and the most likely place for silent bugs
- **Problem log:** every bug, error or failed build that gets fixed is recorded in
  `docs/PROBLEM_LOG.md` (seen / cause / fix / lesson).
- **No analytics SDKs.** No Firebase Analytics, no Meta Pixel, no Sentry, nothing that phones
  home. Audit `package.json` on every dependency addition. The zero-tracker claim is a core
  product promise, not a nice-to-have.
- Never log decrypted payloads, even in development

---

## 10. Things that are easy to get wrong

- **Never show emotion words** anywhere in the UI (§12). Orbs are identified by note only.
- **Don't blend 3+ colours in an orb.** Two maximum, or it goes muddy.
- **Bright/Dark is a toggle** (§12), but switching must still crossfade the palette and
  atmosphere — never snap.
- **Don't skip the atmosphere crossfade.** Without it the app is just a dark theme.
- **Don't use standard three-button transport controls.** The ringed planet is the detail that
  makes the player feel custom.
- **Only one song at a time.** Call `takeTurn(player, pause)` (`src/audio/turns.ts`) before any
  player starts, or two of the app's own players can overlap.
- **A song's file name must change when its notes do** (hash of the notes in the name), because an
  existing cached WAV with the same name is reused.
- **Don't apply ambient blur/starfield to functional screens** (Composer, Settings, forms).
  It's meaningful, not wallpaper.
- **DM Mono has no Bold.** Medium is the heaviest weight available.
- **Never write unencrypted user content to Firestore**, including during debugging.

---

## 11. Added scope (October 2026)

Features added after the original brief. Each is slotted into the build order in §8.

1. **Instrument picker on Home** (Stage 5) ✅ — a button on Home lets the user choose what their
   daily check-in sounds like: **Piano / Violin / Harp / Flute**. The same list is used for the
   Weekly instrument pills. The chosen instrument is stored **inside the encrypted check-in
   payload**, so each day keeps its sound; a week's (and month's) song plays on the instrument
   used most (`mostUsedInstrument`). The picker remembers the last choice. Each instrument is 14
   chord files plus single notes, pre-rendered from recorded samples (see §12, audio).
2. **Per-note vibration for deaf / hard-of-hearing users** (Stage 5) — every note has its own
   recognisable vibration: **pulse count = scale degree** (C = 1 … B = 7, grouped so they're
   countable), **Bright = light, quick pulses; Dark = heavier, slower pulses**. Melody playback
   pulses in rhythm. Controlled by a **"Feel notes"** setting. Android plays exact patterns;
   iOS approximates with its preset impacts.
3. **Monthly song** (Stage 8) ✅ — the month's weekly songs combined into one piece: **every week
   that starts in that month** (so 4 or 5), joined with one-bar linking passages (§7). Playable
   at any point in the month (it grows week by week), with its own moon-phases record (§6).
4. **Share / save songs** (Stage 7) ✅ — **Share** opens a sheet for an optional message (up to 200
   characters, never stored by the app), then the **OS share sheet** with the WAV and the message
   (`react-native-share`). **Save** (Android) writes the file to a folder the user picks; on iPhone
   the share sheet's "Save to Files" does this. Files are named by week and instrument only
   (`Sonata - week of 28 Sep 2026 - Harp.wav`): music and dates, never emotion words or
   reflections. A video with the disc artwork is not built. **No in-app user-to-user sharing** —
   it would need visible accounts, which conflicts with the anonymous, zero-tracker design.
5. **Save to playlist** (Stage 7) ✅ — in-app playlists of the user's own weekly songs (monthly
   songs and Composer pieces later: `PlaylistSong.kind`). Each song keeps the notes it was made
   from, so it always sounds the same; adding the same week on the same instrument again updates
   it in place. Whole playlists are **encrypted** and offline-first like check-ins (collection
   `playlists`). Screens: `app/playlists/index.tsx` (all) and `app/playlists/[id].tsx` (play all in
   order, rename, remove, delete). External services (Spotify, Apple Music) don't allow
   third-party audio, so they're out of scope.
6. **Sheet music in the Oasis** (Stage 9) ✅ — any week's or month's song as a lead sheet: the
   melody on a treble staff with chord names above (`app/sheet-music.tsx`, `src/features/sheet/`).
   - Built from exactly what Weekly and Monthly compose (same weeks and seeds: the Monday's date,
     the 1st of the month), so the score is the song. A month is written week by week at each
     week's own tempo ("Week of 5 Oct ♩ = 84"), with its link bars between; the monthly song is
     stored stretched to one tempo, so `score.ts` un-stretches the link bars (`linkChords` in the
     engine names their two chords).
   - Everything is in C, so there's no key signature: notes outside C major carry their own
     accidental, once per bar. Missed days are whole-bar rests. `notation.ts` does the spelling,
     rests, accidentals and beams for both the drawing and MusicXML.
   - `svg.ts` draws it as one SVG per staff line: on screen in dark ink on a near-white page (the
     standard look for sheet music, a deliberate exception to the dark UI), two bars to a line;
     in the PDF black on white A4, four bars to a line, with page breaks between lines.
   - **Export PDF** (`expo-print`, a native module) and **Export MusicXML** (MuseScore, Sibelius,
     Dorico), both through the share sheet like songs. Nothing is uploaded.
7. **Glockenspiel chimes** — short glockenspiel cues, never an instrument choice: a soft chime
   on **Save check-in** (Stage 5), a cue when **"Composing your week"** finishes (Stage 7), and
   the **phase changes in Breathing space** (Stage 9), so users can breathe with their eyes
   closed. Chimes are rendered with the chords and stay quiet under the main sounds.

---

## 12. Decisions since the original spec

These override earlier sections. Don't "fix" them back.

- **No emotion words in the UI, anywhere** — not on orbs, not on Weekly chips. Emotions
  exist only in the encrypted database, derived from note + mode. Orbs are named by note:
  visible letters under the carousel orbs (`displayName`, "E♭"), screen readers get
  `spokenName` ("E flat"). The centred orb also shows its note on a small **treble staff**.
- **No grid view** (October 2026). The carousel is Home's only view; the circle/grid switch is
  gone from the wireframes and the IA too. Don't add it back.
- **Bright/Dark is a toggle** (a Bright | Dark pill under the Home header), not two vertically
  swiped pages. Switching crossfades orbs, wash, staff and flats over ~600 ms; the Dark page
  has a dimmer wash and slower stars.
- **The toggle says "Major | Minor", not "Bright | Dark"** (user testing, October 2026): testers
  read Bright/Dark with a sun and moon as light/dark mode. Labels are Major and Minor with note
  icons (`Music2`, `Music4`); never a sun, moon or other theme-like icon. "Bright/Dark page" stays
  as the internal name in code and these notes.
- **Settings has a back button** (`BackHeader`), like the Oasis screens.
- **Every orb plays a chord**, not a single note: a major triad on Bright, a minor triad on
  Dark, so all seven Dark orbs sound minor (C, D, F, G included).
- **Graphics: `@shopify/react-native-skia`** for every glow, orb, wash and starfield — one shared
  canvas per area. Stacked `react-native-svg` layers lagged badly on a Galaxy A55.
  `react-native-svg` remains only for Lucide icons.
- **Audio: pre-rendered WAVs played with `expo-audio`** — not `react-native-audio-api`, whose
  real-time synthesis crackled on device. `scripts/render-chords.mjs` renders the chords and
  chimes (`npm run render:chords`). The weekly and monthly songs are mixed to WAV files on the
  phone in JS (`src/audio/mixer.ts`, `song.ts`) from single-note samples, then cached. Audio mode:
  `playsInSilentMode: true` (with it false, Android ignores `play()` on vibrate/silent). The
  `expo-audio` plugin is configured with **no microphone permission and no background
  playback** — the app must never request the microphone.
- **Sounds come from recorded samples, not synthesis** (the synthesised voices sounded poor):
  - Piano: **Salamander Grand Piano V3** (44.1 kHz 16-bit), **CC-BY 3.0**, so Settings must
    credit "Salamander Grand Piano by Alexander Holm (CC-BY 3.0)".
  - Violin, Harp, Flute, Glockenspiel and wind chimes: **VSCO 2 Community Edition** (CC0, no
    credit needed; credited anyway as good practice). Strings and Marimba were tried and dropped.
  - The raw libraries (gigabytes) live **outside the project and outside Google Drive**
    (`C:\sonata-samples\`). Only the rendered WAVs are committed.
  - **Ambient is dropped; Harp replaces it.** VSCO file names don't always use scientific
    octave numbers, so sample pitch is checked before trusting a file name.
- **Carousel gestures** use `react-native-gesture-handler` 2.32 (SDK 57 pin) on the UI thread,
  not ScrollView snapping.
- **Git: commit straight to `main`** (solo project) — no Git Flow branches.
- **Weekly transport is a ringed planet**, not the wavy capsule (the user disliked the capsule's
  shape, and its animation while playing distracted from the disc). Still one shape, not three
  separate buttons.
- **Offline-first:** check-ins, playlists and thought records are sealed (AES-GCM) and saved on the
  phone first (AsyncStorage), then uploaded with `setDoc` and a phone-made id whenever there's a
  connection. The app reads from the phone, so it works offline. Check-ins made before this are
  imported once. Editable records (playlists, thought records) share one store:
  `sealedCollection(name)` in `src/lib/sealedCollection.ts` (on the phone: `sealedStore.ts`, key
  `sonata.<name>.v1`), so a new collection is a few lines, never a copy.
- **Sharing uses `react-native-share`**, not `expo-sharing`, because only it can send a message
  with the file on Android.
- **Disc art:** weekly records are a space scene per mode; the monthly record is moon phases.
  Both are drawn by the same painter (`src/features/weekly/disc/`), so the scenes are tested
  without a screen.
- **No demo data in the app.** The example weeks and month used while building were removed
  (October 2026); test with real check-ins.
- **Design audit (Hallmark, October 2026)** — rules so the app reads as made, not generated:
  - **Glow only where it means something** (an orb, a song's own colours). `BentoCard`'s `glow` is
    optional; most cards go without and stand out by their lighter surface.
  - **No icon tiles** (an icon in a coloured square above a heading), **no rows of matching stat
    tiles**, and **no spaced-out uppercase labels**. Icons sit inline with their text, or not at all.
  - **Bento sizes follow content**, never a fixed pattern of equal cards.
  - **Undo, not "Are you sure?", for anything reversible** (removing a song from a playlist: gone
    straight away, "Undo" for 5 s). Confirmation stays for permanent deletes.
  - **Silent success:** a save shows itself (the day's dot, the button's new label); screen readers
    get an announcement. Only failures get a message.
  - **No pure white:** text uses `text-primary`.
