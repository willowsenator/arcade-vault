import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => { vi.resetModules(); localStorage.clear(); });
afterEach(() => vi.restoreAllMocks());

describe("remembered sound switch (Task 3)", () => {
  it("defaults to on and reads storage only once, lazily", async () => {
    const read = vi.spyOn(Storage.prototype, "getItem");
    const store = await import("./store");
    expect(read).not.toHaveBeenCalled();
    expect(store.SOUND_KEY).toBe("av_sound");
    expect(store.soundEnabled()).toBe(true);
    expect(store.soundEnabled()).toBe(true);
    expect(read).toHaveBeenCalledExactlyOnceWith("av_sound");
  });

  it("writes off and on, notifies subscribers, and unsubscribes", async () => {
    const store = await import("./store");
    const listener = vi.fn();
    const unsubscribe = store.subscribeSound(listener);
    store.setSoundEnabled(false);
    expect(store.soundEnabled()).toBe(false);
    expect(localStorage.getItem("av_sound")).toBe("off");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.setSoundEnabled(true);
    expect(localStorage.getItem("av_sound")).toBe("on");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("reads a previously stored off value", async () => {
    localStorage.setItem("av_sound", "off");
    const store = await import("./store");
    expect(store.soundEnabled()).toBe(false);
  });

  it("keeps toggling in memory when storage reads and writes throw", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Denied"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Full"); });
    const store = await import("./store");
    expect(store.soundEnabled()).toBe(true);
    expect(() => store.setSoundEnabled(false)).not.toThrow();
    expect(store.soundEnabled()).toBe(false);
    expect(() => store.setSoundEnabled(true)).not.toThrow();
    expect(store.soundEnabled()).toBe(true);
  });

  it("updates the external-store hook when the switch changes", async () => {
    const store = await import("./store");
    const hook = renderHook(() => store.useSoundEnabled());
    expect(hook.result.current).toBe(true);
    act(() => store.setSoundEnabled(false));
    expect(hook.result.current).toBe(false);
    hook.unmount();
  });
});
