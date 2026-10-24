import { describe, expect, it } from "vitest";
import { ASTEROIDS_CUES, ASTEROIDS_MUSIC, BLOQUE_BUSTER_CUES, BLOQUE_BUSTER_MUSIC } from "./cues";

describe("cue tables (Task 3)", () => {
  it("copies the brick, life-lost sweep and rising chord exactly", () => {
    expect(BLOQUE_BUSTER_CUES.brick).toEqual([{ freq: 880, type: "square", duration: 0.08, gain: 0.15 }]);
    expect(BLOQUE_BUSTER_CUES.lifeLost).toEqual([{ freq: 220, type: "sawtooth", duration: 0.25, gain: 0.2, sweepTo: 110 }]);
    const rising = [523.25, 659.25, 783.99].map((freq, index) => ({ freq, type: "sine", duration: 0.15, gain: 0.15, delay: index * 0.15 }));
    expect(BLOQUE_BUSTER_CUES.levelUp).toEqual(rising);
    expect(ASTEROIDS_CUES.levelUp).toEqual(rising);
    expect(ASTEROIDS_CUES.shipLost).toEqual(BLOQUE_BUSTER_CUES.lifeLost);
  });

  it("orders both last-life sequences with the exact absolute delays", () => {
    expect(BLOQUE_BUSTER_CUES.lastLife).toEqual([
      { freq: 220, type: "sawtooth", duration: 0.25, gain: 0.2, sweepTo: 110, delay: 0 },
      { freq: 150, type: "square", duration: 0.5, gain: 0.25, sweepTo: 40, delay: 0.25 },
      { freq: 392, type: "sine", duration: 0.18, gain: 0.15, delay: 0.75 },
      { freq: 329.63, type: "sine", duration: 0.18, gain: 0.15, delay: 0.93 },
      { freq: 261.63, type: "sine", duration: 0.18, gain: 0.15, delay: 1.11 },
    ]);
    expect(ASTEROIDS_CUES.lastLife).toEqual([
      { freq: 220, type: "sawtooth", duration: 0.25, gain: 0.2, sweepTo: 110, delay: 0 },
      { freq: 392, type: "sine", duration: 0.18, gain: 0.15, delay: 0.25 },
      { freq: 329.63, type: "sine", duration: 0.18, gain: 0.15, delay: 0.43 },
      { freq: 261.63, type: "sine", duration: 0.18, gain: 0.15, delay: 0.61 },
    ]);
  });

  it("has a single shot and a two-note powerup", () => {
    expect(BLOQUE_BUSTER_CUES.paddle).toEqual([{ freq: 440, type: "square", duration: 0.05, gain: 0.12 }]);
    expect(ASTEROIDS_CUES.shot).toEqual([{ freq: 660, type: "square", duration: 0.04, gain: 0.1 }]);
    expect(ASTEROIDS_CUES.asteroid).toEqual([{ freq: 160, type: "sawtooth", duration: 0.12, gain: 0.15, sweepTo: 60 }]);
    expect(ASTEROIDS_CUES.powerup).toEqual([
      { freq: 659.25, type: "sine", duration: 0.08, gain: 0.12, delay: 0 },
      { freq: 987.77, type: "sine", duration: 0.08, gain: 0.12, delay: 0.08 },
    ]);
  });

  it("defines both music loops exactly", () => {
    expect(BLOQUE_BUSTER_MUSIC).toEqual({ notes: [220, 261.63, 246.94, 196], step: 0.35, noteDuration: 0.315, type: "triangle", gain: 0.08 });
    expect(ASTEROIDS_MUSIC).toEqual({ notes: [110, 130.81, 146.83, 123.47], step: 0.4, noteDuration: 0.36, type: "triangle", gain: 0.08 });
  });
});
