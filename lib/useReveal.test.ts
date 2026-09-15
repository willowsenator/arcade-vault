import { describe, expect, it, afterEach } from "vitest";
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
});
