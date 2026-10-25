import type { Cue, MusicLoop } from "./synth";

const lifeLost: Cue = [{ freq: 220, type: "sawtooth", duration: 0.25, gain: 0.2, sweepTo: 110 }];
const levelUp: Cue = [523.25, 659.25, 783.99].map((freq, index) => ({
  freq, type: "sine", duration: 0.15, gain: 0.15, delay: index * 0.15,
}));

function gameOver(delays: readonly number[]): Cue {
  return [392, 329.63, 261.63].map((freq, index) => ({
    freq, type: "sine", duration: 0.18, gain: 0.15, delay: delays[index],
  }));
}

export const BLOQUE_BUSTER_CUES = {
  brick: [{ freq: 880, type: "square", duration: 0.08, gain: 0.15 }],
  paddle: [{ freq: 440, type: "square", duration: 0.05, gain: 0.12 }],
  lifeLost,
  lastLife: [
    { ...lifeLost[0], delay: 0 },
    { freq: 150, type: "square", duration: 0.5, gain: 0.25, sweepTo: 40, delay: 0.25 },
    ...gameOver([0.75, 0.93, 1.11]),
  ],
  levelUp,
} satisfies Record<string, Cue>;

export const ASTEROIDS_CUES = {
  shot: [{ freq: 660, type: "square", duration: 0.04, gain: 0.1 }],
  asteroid: [{ freq: 160, type: "sawtooth", duration: 0.12, gain: 0.15, sweepTo: 60 }],
  shipLost: lifeLost,
  lastLife: [{ ...lifeLost[0], delay: 0 }, ...gameOver([0.25, 0.43, 0.61])],
  powerup: [
    { freq: 659.25, type: "sine", duration: 0.08, gain: 0.12, delay: 0 },
    { freq: 987.77, type: "sine", duration: 0.08, gain: 0.12, delay: 0.08 },
  ],
  levelUp,
} satisfies Record<string, Cue>;

export const BLOQUE_BUSTER_MUSIC: MusicLoop = {
  notes: [220, 261.63, 246.94, 196], step: 0.35, noteDuration: 0.315, type: "triangle", gain: 0.08,
};
export const ASTEROIDS_MUSIC: MusicLoop = {
  notes: [110, 130.81, 146.83, 123.47], step: 0.4, noteDuration: 0.36, type: "triangle", gain: 0.08,
};
