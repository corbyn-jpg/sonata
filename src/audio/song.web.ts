// The browser's version of song.ts: the samples are fetched over HTTP instead of read from the phone, and the mixed
// song is kept in memory as a blob URL instead of a file in the cache. The mixing itself is shared (mixer.ts).
import { Asset } from "expo-asset";
import { NOTE_RATE, NOTES } from "./chords.generated";
import { ACCOMPANIMENT, type Instrument } from "./instruments";
import { decodeWav, encodeWav, mixSong, type NoteSample, type Playable } from "./mixer";

/** What callers use of a rendered song: where to play it from, and a way to let it go. */
export type RenderedSong = { uri: string; delete(): void };

// Each instrument's notes are fetched and decoded once, the first time it plays, then kept for the visit
const loaded = new Map<Instrument, Promise<NoteSample[]>>();

function samplesFor(instrument: Instrument): Promise<NoteSample[]> {
  let samples = loaded.get(instrument);
  if (!samples) {
    samples = Promise.all(
      NOTES[instrument].map(async ([midi, source]) => {
        const response = await fetch(Asset.fromModule(source).uri);
        if (!response.ok) throw new Error(`Couldn't load a ${instrument} note (${response.status})`);
        return { midi, audio: decodeWav(new Uint8Array(await response.arrayBuffer())) };
      }),
    );
    samples.catch(() => loaded.delete(instrument)); // let a failed load be retried
    loaded.set(instrument, samples);
  }
  return samples;
}

// Songs already mixed this visit, by name, so replaying one doesn't mix it again
const rendered = new Map<string, RenderedSong>();

/** The song as a WAV in memory. `name` must change whenever the song does, because a song with the same name is reused. */
export async function renderSong(song: Playable, instrument: Instrument, name: string): Promise<RenderedSong> {
  const key = `${name}-${instrument}`;
  const cached = rendered.get(key);
  if (cached) return cached;

  const [melody, accompaniment] = await Promise.all([samplesFor(instrument), samplesFor(ACCOMPANIMENT[instrument])]);
  const wav = encodeWav(mixSong(song, { melody, accompaniment }, NOTE_RATE), NOTE_RATE);
  // encodeWav makes a fresh buffer of exactly this length, so the whole buffer is the file
  const uri = URL.createObjectURL(new Blob([wav.buffer as ArrayBuffer], { type: "audio/wav" }));
  const result: RenderedSong = {
    uri,
    delete() {
      URL.revokeObjectURL(uri);
      rendered.delete(key);
    },
  };
  rendered.set(key, result);
  return result;
}
