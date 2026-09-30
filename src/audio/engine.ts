import {
  AudioContext,
  AudioManager,
  type GainNode,
} from "react-native-audio-api";

type Audio = { context: AudioContext; output: GainNode };

let audio: Audio | null = null;

// tanh: untouched when quiet, rounds peaks off smoothly instead of clipping into crackle
function softClipCurve(size = 2048) {
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    curve[i] = Math.tanh((i / (size - 1)) * 2 - 1);
  }
  return curve;
}

/** One shared audio context for the whole app, created on first use. Connect voices to `output`. */
export function getAudio(): Audio {
  if (!audio) {
    // iOS: respect the silent switch and play alongside the user's own music.
    // Android: we never request audio focus, so their music keeps playing too.
    AudioManager.setAudioSessionOptions({ iosCategory: "ambient" });
    const context = new AudioContext();

    const limiter = context.createWaveShaper();
    limiter.curve = softClipCurve();
    limiter.oversample = "4x";
    limiter.connect(context.destination);

    const output = context.createGain();
    output.gain.value = 0.8;
    output.connect(limiter);

    audio = { context, output };
  }
  return audio;
}