export type Tone = {
  freq: number;
  type: OscillatorType;
  duration: number;
  gain: number;
  sweepTo?: number;
  delay?: number;
};
export type Cue = readonly Tone[];
export type MusicLoop = {
  notes: readonly number[];
  step: number;
  noteDuration: number;
  type: OscillatorType;
  gain: number;
};
export const MAX_VOICES = 8;

type Voice = { oscillator: OscillatorNode; start: number; stop: number };

function quietly(action: () => void): void {
  try { action(); } catch { /* Audio may be unavailable or closed. */ }
}

export class Synth {
  private context: AudioContext | null = null;
  private effects = new Set<Voice>();
  private music = new Set<Voice>();
  private musicTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly createContext: () => AudioContext | null) {}

  unlock(): void {
    quietly(() => {
      this.context ??= this.createContext();
      if (this.context?.state === "suspended") {
        void this.context.resume().catch(() => {});
      }
    });
  }

  play(cue: Cue): void {
    this.unlock();
    quietly(() => {
      const context = this.context;
      if (!context) return;
      const now = context.currentTime;
      for (const voice of this.effects) {
        if (voice.stop <= now) this.effects.delete(voice);
      }
      const pending = cue.map((tone) => {
        const start = now + (tone.delay ?? 0);
        return { tone, start, stop: start + tone.duration };
      });
      const voices = [...this.effects, ...pending];
      // Existing delayed voices can also raise the count while a new tone sounds.
      const exceedsCap = voices.some(({ start }) =>
        voices.filter((voice) => voice.start <= start && start < voice.stop).length > MAX_VOICES,
      );
      if (exceedsCap) return;
      for (const { tone, start } of pending) this.schedule(tone, start, this.effects);
    });
  }

  cancelPending(): void {
    quietly(() => {
      if (!this.context) return;
      for (const voice of this.effects) {
        if (voice.start > this.context.currentTime) {
          quietly(() => voice.oscillator.stop());
          this.effects.delete(voice);
        }
      }
    });
  }

  get musicPlaying(): boolean { return this.musicTimer !== null; }

  startMusic(loop: MusicLoop): void {
    this.stopMusic();
    this.unlock();
    quietly(() => {
      const context = this.context;
      if (!context || loop.notes.length === 0 || !Number.isFinite(loop.step) || loop.step <= 0) return;
      let nextNoteTime = context.currentTime;
      let index = 0;
      const scheduleWindow = () => quietly(() => {
        const now = context.currentTime;
        for (const voice of this.music) {
          if (voice.stop <= now) this.music.delete(voice);
        }
        nextNoteTime = Math.max(nextNoteTime, now);
        while (nextNoteTime < now + 0.25) {
          this.schedule({
            freq: loop.notes[index % loop.notes.length], type: loop.type,
            duration: loop.noteDuration, gain: loop.gain,
          }, nextNoteTime, this.music);
          nextNoteTime += loop.step;
          index++;
        }
      });
      scheduleWindow();
      this.musicTimer = setInterval(scheduleWindow, 100);
    });
  }

  stopMusic(): void {
    if (this.musicTimer !== null) clearInterval(this.musicTimer);
    this.musicTimer = null;
    for (const voice of this.music) quietly(() => voice.oscillator.stop());
    this.music.clear();
  }

  private schedule(tone: Tone, start: number, voices: Set<Voice>): void {
    quietly(() => {
      const context = this.context;
      if (!context) return;
      const oscillator = context.createOscillator();
      let gain: GainNode | undefined;
      try {
        gain = context.createGain();
        const stop = start + tone.duration;
        oscillator.type = tone.type;
        oscillator.frequency.setValueAtTime(tone.freq, start);
        if (tone.sweepTo !== undefined) oscillator.frequency.linearRampToValueAtTime(tone.sweepTo, stop);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(tone.gain, start + 0.01);
        gain.gain.linearRampToValueAtTime(0, stop);
        oscillator.connect(gain);
        gain.connect(context.destination);
        const voice = { oscillator, start, stop };
        const gainNode = gain;
        oscillator.onended = () => {
          voices.delete(voice);
          quietly(() => oscillator.disconnect());
          quietly(() => gainNode.disconnect());
        };
        oscillator.start(start);
        oscillator.stop(stop);
        voices.add(voice);
      } catch {
        quietly(() => oscillator.stop());
        quietly(() => oscillator.disconnect());
        quietly(() => gain?.disconnect());
      }
    });
  }
}
