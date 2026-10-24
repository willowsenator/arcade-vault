"use client";

import { Synth, type Cue, type MusicLoop } from "./synth";
import { soundEnabled, subscribeSound } from "./store";

export { soundEnabled, setSoundEnabled, subscribeSound, useSoundEnabled, SOUND_KEY } from "./store";
export type { Cue, Tone, MusicLoop } from "./synth";

export function createSound(createContext: () => AudioContext | null) {
  const synth = new Synth(createContext);
  let requestedLoop: MusicLoop | null = null;

  subscribeSound(() => {
    if (!soundEnabled()) {
      synth.stopMusic();
      synth.cancelPending();
    } else if (requestedLoop) synth.startMusic(requestedLoop);
  });

  return {
    play(cue: Cue): void { if (soundEnabled()) synth.play(cue); },
    startMusic(loop: MusicLoop): void {
      requestedLoop = loop;
      if (soundEnabled()) synth.startMusic(loop);
    },
    stopMusic(): void { requestedLoop = null; synth.stopMusic(); },
    cancelPending(): void { synth.cancelPending(); },
    armGestureUnlock(): () => void {
      if (typeof window === "undefined") return () => {};
      const cleanup = () => {
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("pointerdown", unlock);
      };
      const unlock = () => {
        cleanup();
        synth.unlock();
        if (requestedLoop && soundEnabled()) synth.startMusic(requestedLoop);
      };
      window.addEventListener("keydown", unlock, { once: true });
      window.addEventListener("pointerdown", unlock, { once: true });
      return cleanup;
    },
  };
}

function defaultContext(): AudioContext | null {
  try {
    if (typeof window === "undefined" || !window.AudioContext) return null;
    return new window.AudioContext();
  } catch { return null; }
}

export const sound = createSound(defaultContext);
