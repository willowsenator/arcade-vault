"use client";

import { useSyncExternalStore } from "react";

export const SOUND_KEY = "av_sound";
const listeners = new Set<() => void>();
let enabled: boolean | undefined;

export function soundEnabled(): boolean {
  if (enabled === undefined) {
    if (typeof window === "undefined") return true;
    try { enabled = localStorage.getItem(SOUND_KEY) !== "off"; }
    catch { enabled = true; }
  }
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); }
  catch { /* Keep the in-memory preference when storage is unavailable. */ }
  listeners.forEach((listener) => listener());
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(subscribeSound, soundEnabled, () => true);
}
