// Renders a week's song to a WAV file on the phone (cached), ready to play or share.
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import type { Composition } from '@/engine';
import { NOTE_RATE, NOTES } from './chords.generated';
import type { Instrument } from './instruments';
import { decodeWav, encodeWav, mixSong, type NoteSample } from './mixer';

/** Who plays the chords and bass under each melody instrument (violin and flute can't go that low). */
export const ACCOMPANIMENT: Record<Instrument, Instrument> = {
  piano: 'piano',
  violin: 'piano',
  harp: 'harp',
  flute: 'harp',
};

// Each instrument's notes are decoded once, then kept for the session
const loaded = new Map<Instrument, Promise<NoteSample[]>>();

function samplesFor(instrument: Instrument): Promise<NoteSample[]> {
  let samples = loaded.get(instrument);
  if (!samples) {
    samples = Promise.all(
      NOTES[instrument].map(async ([midi, source]) => {
        const asset = await Asset.fromModule(source).downloadAsync();
        const bytes = await new File(asset.localUri ?? asset.uri).bytes();
        return { midi, audio: decodeWav(bytes) };
      }),
    );
    samples.catch(() => loaded.delete(instrument)); // let a failed load be retried
    loaded.set(instrument, samples);
  }
  return samples;
}

/**
 The song as a WAV file in the cache. `name` must change whenever the song does (e.g. include a hash of the week), because an existing file with the same name is reused.
 */
export async function renderSong(song: Composition, instrument: Instrument, name: string): Promise<File> {
  const file = new File(Paths.cache, `${name}-${instrument}.wav`);
  if (file.exists) return file;

  const [melody, accompaniment] = await Promise.all([
    samplesFor(instrument),
    samplesFor(ACCOMPANIMENT[instrument]),
  ]);
  const audio = mixSong(song, { melody, accompaniment }, NOTE_RATE);
  file.create({ overwrite: true });
  file.write(encodeWav(audio, NOTE_RATE));
  return file;
}