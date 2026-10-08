// Ambient loops for the Oasis, from Moodist (github.com/remvze/moodist)

export type CalmingSound = {
  id: string;
  name: string;
  /** One plain line on what it sounds like. */
  about: string;
  source: number;
  /**
   Playback volume that brings this recording to the same loudness as the others (-33 LUFS, measured with ITU-R BS.1770)
   */
  volume: number;
};

export const CALMING_SOUNDS: readonly CalmingSound[] = [
  { id: "rain", name: "Rain on glass", about: "Steady rain against a window", source: require("../../../assets/sounds/calm/rain-on-window.mp3"), volume: 0.15 },
  { id: "ocean", name: "Night ocean", about: "Slow waves on the shore", source: require("../../../assets/sounds/calm/waves.mp3"), volume: 0.9 },
  { id: "river", name: "River", about: "Water running over stones", source: require("../../../assets/sounds/calm/river.mp3"), volume: 0.58 },
  { id: "underwater", name: "Underwater", about: "Deep, muffled water all around", source: require("../../../assets/sounds/calm/underwater.mp3"), volume: 0.69 },
  { id: "birds", name: "Morning birds", about: "Birdsong in the early light", source: require("../../../assets/sounds/calm/birds.mp3"), volume: 0.22 },
  { id: "crickets", name: "Crickets at dusk", about: "A warm evening outside", source: require("../../../assets/sounds/calm/crickets.wav"), volume: 1 },
  { id: "campfire", name: "Campfire", about: "A low fire, crackling", source: require("../../../assets/sounds/calm/campfire.mp3"), volume: 1 },
  { id: "chimes", name: "Wind chimes", about: "Chimes moving in a light breeze", source: require("../../../assets/sounds/calm/wind-chimes.mp3"), volume: 0.4 },
  { id: "bowl", name: "Singing bowl", about: "A long, ringing tone", source: require("../../../assets/sounds/calm/singing-bowl.mp3"), volume: 0.12 },
  { id: "hum", name: "Low hum", about: "Deep, steady brown noise", source: require("../../../assets/sounds/calm/brown-noise.wav"), volume: 0.39 },
];