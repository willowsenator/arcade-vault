import { describe, expect, it, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useReveal } from "./useReveal";

describe("useReveal", () => {
  const originalIO = globalThis.IntersectionObserver;

  afterEach(() => {
    globalThis.IntersectionObserver = originalIO;
    document.body.innerHTML = "";
  });

  it("reveals .reveal elements immediately when IntersectionObserver is unavailable", () => {
    // @ts-expect-error simulate an environment without IntersectionObserver
    delete globalThis.IntersectionObserver;

    const el = document.createElement("div");
    el.className = "reveal";
    document.body.appendChild(el);

    renderHook(() => useReveal());

    expect(el.classList.contains("in")).toBe(true);
  });

  it("observes .reveal elements and reveals them when they intersect, using IntersectionObserver", () => {
    let capturedCallback: (entries: { isIntersecting: boolean; target: Element }[]) => void = () => {};
    const observe = vi.fn();
    const unobserve = vi.fn();
    const disconnect = vi.fn();

    class FakeIntersectionObserver {
      constructor(callback: (entries: { isIntersecting: boolean; target: Element }[]) => void) {
        capturedCallback = callback;
      }
      observe = observe;
      unobserve = unobserve;
      disconnect = disconnect;
    }

    // @ts-expect-error assign a fake IntersectionObserver for the test
    globalThis.IntersectionObserver = FakeIntersectionObserver;

    const el = document.createElement("div");
    el.className = "reveal";
    document.body.appendChild(el);

    const { unmount } = renderHook(() => useReveal());

    expect(observe).toHaveBeenCalledWith(el);

    capturedCallback([{ isIntersecting: true, target: el }]);

    expect(el.classList.contains("in")).toBe(true);
    expect(unobserve).toHaveBeenCalledWith(el);

    unmount();

    expect(disconnect).toHaveBeenCalled();
  });
});
