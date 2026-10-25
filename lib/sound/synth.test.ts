import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_VOICES, Synth, type MusicLoop, type Tone } from "./synth";
import { fakeAudio } from "./testing";

const tone: Tone = { freq: 880, type: "square", duration: 0.08, gain: 0.15 };

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("effect synth (Task 1)", () => {
  it("schedules the oscillator and attack/release envelope exactly", () => {
    const audio = fakeAudio();
    new Synth(audio.createContext).play([tone]);
    expect(audio.tones).toEqual([{
      freq: 880, type: "square", start: 0, stop: 0.08, stopped: false,
      gain: [{ value: 0, time: 0 }, { value: 0.15, time: 0.01 }, { value: 0, time: 0.08 }],
    }]);
  });

  it("sweeps linearly until the delayed tone ends", () => {
    const audio = fakeAudio();
    new Synth(audio.createContext).play([{ ...tone, delay: 0.25, sweepTo: 110 }]);
    expect(audio.tones[0]).toMatchObject({ start: 0.25, stop: 0.33, sweepTo: { value: 110, time: 0.33 } });
  });

  it("overlaps cues and drops a whole cue at the voice cap, then recovers", () => {
    const audio = fakeAudio();
    const synth = new Synth(audio.createContext);
    expect(MAX_VOICES).toBe(8);
    synth.play([tone]);
    synth.play(Array.from({ length: 7 }, () => tone));
    expect(audio.tones).toHaveLength(8);
    synth.play([tone, tone]);
    expect(audio.tones).toHaveLength(8);
    audio.advance(0.09);
    synth.play([tone]);
    expect(audio.tones).toHaveLength(9);
  });

  it("counts delayed voices only when sounding and cancelled voices never", () => {
    const audio = fakeAudio();
    const synth = new Synth(audio.createContext);
    synth.play(Array.from({ length: 8 }, () => ({ ...tone, delay: 0.25 })));
    synth.play([tone]);
    expect(audio.tones).toHaveLength(9);
    audio.advance(0.25);
    synth.play([tone]);
    expect(audio.tones).toHaveLength(9);
    audio.advance(0.08);
    synth.play([tone]);
    expect(audio.tones).toHaveLength(10);
  });

  it("drops the whole two-tone cue when seven effects are sounding", () => {
    const audio = fakeAudio();
    const synth = new Synth(audio.createContext);
    synth.play(Array.from({ length: 7 }, () => tone));
    expect(audio.tones).toHaveLength(7);
    synth.play([tone, tone]);
    expect(audio.tones).toHaveLength(7);
  });

  it("allows one more tone when seven effects are sounding", () => {
    const audio = fakeAudio();
    const synth = new Synth(audio.createContext);
    synth.play(Array.from({ length: 7 }, () => tone));
    synth.play([tone]);
    expect(audio.tones).toHaveLength(8);
    expect(audio.tones[7]).toMatchObject({ start: 0, stop: 0.08 });
  });

  it("allows a sequential cue when earlier effects end before its later tone", () => {
    const audio = fakeAudio();
    const synth = new Synth(audio.createContext);
    synth.play(Array.from({ length: 7 }, () => tone));
    synth.play([{ ...tone, duration: 0.2 }, { ...tone, duration: 0.2, delay: 0.25 }]);
    expect(audio.tones).toHaveLength(9);
    expect(audio.tones.slice(7)).toMatchObject([{ start: 0, stop: 0.2 }, { start: 0.25, stop: 0.45 }]);
  });

  it("rejects a tone that would overlap eight previously scheduled delayed effects", () => {
    const audio = fakeAudio();
    const synth = new Synth(audio.createContext);
    synth.play(Array.from({ length: 8 }, () => ({ ...tone, delay: 0.25, duration: 0.3 })));
    expect(audio.tones).toHaveLength(8);
    synth.play([{ ...tone, duration: 0.5 }]);
    expect(audio.tones).toHaveLength(8);
  });

  it("cancels future effects while leaving started effects alone", () => {
    const audio = fakeAudio();
    const synth = new Synth(audio.createContext);
    synth.play([tone, ...Array.from({ length: 8 }, () => ({ ...tone, delay: 0.25 }))]);
    synth.cancelPending();
    expect(audio.tones.map((entry) => entry.stopped)).toEqual([false, ...Array(8).fill(true)]);
    audio.advance(0.25);
    synth.play([tone]);
    expect(audio.tones).toHaveLength(10);
  });

  it("creates lazily and resumes a suspended context before scheduling", () => {
    const audio = fakeAudio({ state: "suspended" });
    const factory = vi.fn(audio.createContext);
    const synth = new Synth(factory);
    expect(factory).not.toHaveBeenCalled();
    synth.play([tone]);
    synth.play([tone]);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(audio.resumeCalls).toBe(1);
    expect(audio.tones).toHaveLength(2);
  });

  it("unlocks a suspended context without scheduling a tone", () => {
    const audio = fakeAudio({ state: "suspended" });
    const synth = new Synth(audio.createContext);
    synth.unlock();
    expect(audio.resumeCalls).toBe(1);
    expect(audio.tones).toEqual([]);
  });

  it.each([() => null, () => { throw new Error("Unavailable"); }])("silently handles an unavailable context", (factory) => {
    const synth = new Synth(factory);
    expect(() => { synth.unlock(); synth.play([tone]); synth.cancelPending(); }).not.toThrow();
  });

  it("guards throwing audio operations and rejected resume promises", async () => {
    const audio = fakeAudio({ state: "suspended" });
    const context = audio.createContext();
    vi.spyOn(context, "resume").mockRejectedValue(new Error("Blocked"));
    vi.spyOn(context, "createOscillator").mockImplementation(() => { throw new Error("Closed"); });
    const synth = new Synth(() => context);
    expect(() => { synth.unlock(); synth.play([tone]); synth.cancelPending(); }).not.toThrow();
    await Promise.resolve();
  });
});

const loop: MusicLoop = { notes: [220, 261.63], step: 0.35, noteDuration: 0.315, type: "triangle", gain: 0.08 };

describe("music scheduler (Task 2)", () => {
  it("cycles notes with the exact step, duration, waveform and envelope", () => {
    vi.useFakeTimers();
    const audio = fakeAudio();
    const synth = new Synth(audio.createContext);
    synth.startMusic(loop);
    for (let i = 0; i < 10; i++) { audio.advance(0.1); vi.advanceTimersByTime(100); }
    expect(audio.tones.slice(0, 3).map(({ freq, start }) => ({ freq, start }))).toEqual([
      { freq: 220, start: 0 }, { freq: 261.63, start: 0.35 }, { freq: 220, start: 0.7 },
    ]);
    for (const entry of audio.tones) {
      expect(entry.type).toBe("triangle");
      expect(entry.stop - entry.start).toBeCloseTo(0.315);
      expect(entry.gain).toEqual([{ value: 0, time: entry.start }, { value: 0.08, time: entry.start + 0.01 }, { value: 0, time: entry.stop }]);
    }
    expect(synth.musicPlaying).toBe(true);
    synth.stopMusic();
  });

  it("restarts at the first note with only one timer after repeated toggles", () => {
    vi.useFakeTimers();
    const audio = fakeAudio();
    const synth = new Synth(audio.createContext);
    for (let i = 0; i < 10; i++) { synth.startMusic(loop); synth.stopMusic(); }
    synth.startMusic(loop);
    audio.advance(0.1);
    synth.startMusic(loop);
    const restart = audio.tones.length - 1;
    expect(audio.tones[restart]).toMatchObject({ freq: 220, start: 0.1 });
    expect(vi.getTimerCount()).toBe(1);
    for (let i = 0; i < 10; i++) { audio.advance(0.1); vi.advanceTimersByTime(100); }
    const starts = audio.tones.filter((entry) => !entry.stopped).map((entry) => entry.start);
    expect(new Set(starts).size).toBe(starts.length);
    expect(audio.tones.slice(restart, restart + 3).map((entry) => entry.freq)).toEqual([220, 261.63, 220]);
    synth.stopMusic();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops scheduled music and its timer without stopping effects", () => {
    vi.useFakeTimers();
    const audio = fakeAudio();
    const synth = new Synth(audio.createContext);
    synth.play([{ ...tone, duration: 1 }]);
    synth.startMusic({ ...loop, step: 0.1 });
    expect(audio.tones[2].start).toBeGreaterThan(0);
    synth.stopMusic();
    expect(audio.tones[0].stopped).toBe(false);
    expect(audio.tones.slice(1).every((entry) => entry.stopped)).toBe(true);
    const count = audio.tones.length;
    audio.advance(1);
    vi.advanceTimersByTime(1000);
    expect(audio.tones).toHaveLength(count);
    expect(synth.musicPlaying).toBe(false);
  });

  it("never backfills after a throttled tab jumps the audio clock", () => {
    vi.useFakeTimers();
    const audio = fakeAudio();
    const synth = new Synth(audio.createContext);
    synth.startMusic({ ...loop, step: 0.1 });
    const count = audio.tones.length;
    audio.advance(5);
    vi.advanceTimersByTime(100);
    const scheduled = audio.tones.slice(count);
    expect(scheduled.length).toBeGreaterThan(0);
    expect(scheduled.length).toBeLessThanOrEqual(3);
    expect(scheduled.every((entry) => entry.start >= 5 && entry.start < 5.25)).toBe(true);
    synth.stopMusic();
  });

  it("does not count music toward the effects cap in either direction", () => {
    vi.useFakeTimers();
    const audio = fakeAudio();
    const synth = new Synth(audio.createContext);
    synth.startMusic(loop);
    synth.play(Array.from({ length: 8 }, () => ({ ...tone, duration: 1 })));
    expect(audio.tones).toHaveLength(9);
    audio.advance(0.2);
    vi.advanceTimersByTime(100);
    expect(audio.tones).toHaveLength(10);
    synth.play([tone]);
    expect(audio.tones).toHaveLength(10);
    synth.stopMusic();
  });

  it.each([() => null, () => { throw new Error("Unavailable"); }])("silently handles unavailable audio without a music timer", (factory) => {
    vi.useFakeTimers();
    const synth = new Synth(factory);
    expect(() => { synth.startMusic(loop); synth.stopMusic(); }).not.toThrow();
    expect(synth.musicPlaying).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
