import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAudio } from "./testing";
import type { Cue, MusicLoop } from "./synth";

const cue: Cue = [{ freq: 880, type: "square", duration: 0.08, gain: 0.15 }];
const loop: MusicLoop = { notes: [220, 261.63], step: 0.35, noteDuration: 0.315, type: "triangle", gain: 0.08 };

beforeEach(() => { vi.resetModules(); localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("sound facade (Task 3)", () => {
  it("re-exports the store API, without exporting cue tables", async () => {
    const facade = await import("./index");
    const store = await import("./store");
    for (const key of ["soundEnabled", "setSoundEnabled", "subscribeSound", "useSoundEnabled", "SOUND_KEY"] as const) {
      expect(facade[key]).toBe(store[key]);
    }
    expect(facade).not.toHaveProperty("ASTEROIDS_CUES");
    expect(facade).not.toHaveProperty("BLOQUE_BUSTER_MUSIC");
  });

  it("does not create audio or play effects/music while disabled", async () => {
    const { createSound, setSoundEnabled } = await import("./index");
    const audio = fakeAudio();
    const factory = vi.fn(audio.createContext);
    const sound = createSound(factory);
    setSoundEnabled(false);
    sound.play(cue);
    sound.startMusic(loop);
    expect(factory).not.toHaveBeenCalled();
    expect(audio.tones).toEqual([]);
    sound.stopMusic();
  });

  it("cancels the future last-life sequence and music, then resumes remembered music", async () => {
    const { createSound, setSoundEnabled } = await import("./index");
    const { BLOQUE_BUSTER_CUES } = await import("./cues");
    const audio = fakeAudio();
    const sound = createSound(audio.createContext);
    sound.play(BLOQUE_BUSTER_CUES.lastLife);
    sound.startMusic(loop);
    setSoundEnabled(false);
    expect(audio.tones.slice(0, 5).map((entry) => entry.stopped)).toEqual([false, true, true, true, true]);
    expect(audio.tones[5].stopped).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    setSoundEnabled(true);
    expect(audio.tones[6]).toMatchObject({ freq: 220, start: 0, stopped: false });
    expect(vi.getTimerCount()).toBe(1);
    sound.stopMusic();
    setSoundEnabled(false);
    setSoundEnabled(true);
    expect(audio.tones).toHaveLength(7);
  });

  it("remembers music requested while off and exposes pending cancellation", async () => {
    const { createSound, setSoundEnabled } = await import("./index");
    const audio = fakeAudio();
    const sound = createSound(audio.createContext);
    setSoundEnabled(false);
    sound.startMusic(loop);
    setSoundEnabled(true);
    expect(audio.tones[0].freq).toBe(220);
    sound.play([{ ...cue[0], delay: 0.25 }]);
    sound.cancelPending();
    expect(audio.tones[1].stopped).toBe(true);
    sound.stopMusic();
  });

  it.each(["keydown", "pointerdown"])("unlocks and restarts remembered music only on the first %s", async (event) => {
    const { createSound } = await import("./index");
    const audio = fakeAudio({ state: "suspended", resumable: false });
    const sound = createSound(audio.createContext);
    expect(() => sound.startMusic(loop)).not.toThrow();
    const before = audio.resumeCalls;
    const count = audio.tones.length;
    const cleanup = sound.armGestureUnlock();
    window.dispatchEvent(new Event(event));
    expect(audio.resumeCalls).toBeGreaterThan(before);
    expect(audio.tones).toHaveLength(count + 1);
    expect(audio.tones.at(-1)?.freq).toBe(220);
    const resumed = audio.resumeCalls;
    window.dispatchEvent(new Event("keydown"));
    window.dispatchEvent(new Event("pointerdown"));
    expect(audio.resumeCalls).toBe(resumed);
    expect(audio.tones).toHaveLength(count + 1);
    expect(vi.getTimerCount()).toBe(1);
    cleanup();
    sound.stopMusic();
  });

  it("removes both gesture listeners on cleanup and unlocks without a loop", async () => {
    const { createSound } = await import("./index");
    const audio = fakeAudio({ state: "suspended" });
    const sound = createSound(audio.createContext);
    sound.armGestureUnlock()();
    window.dispatchEvent(new Event("keydown"));
    window.dispatchEvent(new Event("pointerdown"));
    expect(audio.resumeCalls).toBe(0);
    const cleanup = sound.armGestureUnlock();
    window.dispatchEvent(new Event("pointerdown"));
    expect(audio.resumeCalls).toBe(1);
    expect(audio.tones).toEqual([]);
    cleanup();
  });

  it("does not restart requested music on a gesture while disabled", async () => {
    const { createSound, setSoundEnabled } = await import("./index");
    const audio = fakeAudio({ state: "suspended" });
    const sound = createSound(audio.createContext);
    setSoundEnabled(false);
    sound.startMusic(loop);
    const cleanup = sound.armGestureUnlock();
    window.dispatchEvent(new Event("keydown"));
    expect(audio.resumeCalls).toBe(1);
    expect(audio.tones).toEqual([]);
    cleanup();
    sound.stopMusic();
  });

  it.each([() => null, () => { throw new Error("Unavailable"); }])("makes every method safe with unavailable audio", async (factory) => {
    const { createSound, setSoundEnabled } = await import("./index");
    const sound = createSound(factory);
    expect(() => {
      sound.play(cue); sound.startMusic(loop); sound.cancelPending(); sound.stopMusic();
      const cleanup = sound.armGestureUnlock();
      window.dispatchEvent(new Event("keydown"));
      cleanup();
      setSoundEnabled(false); setSoundEnabled(true);
    }).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("guards absent and throwing default AudioContext constructors", async () => {
    const { sound } = await import("./index");
    vi.stubGlobal("AudioContext", undefined);
    expect(() => { sound.play(cue); sound.startMusic(loop); sound.stopMusic(); }).not.toThrow();
    vi.stubGlobal("AudioContext", class { constructor() { throw new Error("Blocked"); } });
    expect(() => { sound.play(cue); sound.startMusic(loop); sound.stopMusic(); }).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});
