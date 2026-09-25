import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTimeout } from "./with-timeout";

describe("withTimeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("resolves with the work's value before the deadline and leaves no pending timer", async () => {
    await expect(withTimeout(Promise.resolve("done"), 1000)).resolves.toBe("done");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects with a timeout error once the deadline passes", async () => {
    const pending = withTimeout(new Promise<never>(() => {}), 1000);
    const assertion = expect(pending).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("propagates the work's own rejection and clears the timer", async () => {
    const failure = new Error("boom");
    await expect(withTimeout(Promise.reject(failure), 1000)).rejects.toBe(failure);
    expect(vi.getTimerCount()).toBe(0);
  });
});
