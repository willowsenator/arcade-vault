import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useOwnBest } from "./useOwnBest";

const mocks = vi.hoisted(() => ({ fetchOwnBest: vi.fn(), createClient: vi.fn() }));

vi.mock("@/lib/score-queries", () => ({ fetchOwnBest: mocks.fetchOwnBest }));
vi.mock("@/utils/supabase/client", () => ({ createClient: mocks.createClient }));

const best = { score: 12345, date: "09/05/2026", rank: 3 };

describe("useOwnBest", () => {
  beforeEach(() => {
    mocks.fetchOwnBest.mockReset();
    mocks.createClient.mockReset();
    mocks.createClient.mockReturnValue({});
  });

  it("is idle without a name", () => {
    const { result } = renderHook(() => useOwnBest("rocas", null));
    expect(result.current).toEqual({ status: "idle" });
    expect(mocks.fetchOwnBest).not.toHaveBeenCalled();
  });

  it("loads and then returns the best score", async () => {
    mocks.fetchOwnBest.mockResolvedValue(best);
    const { result } = renderHook(() => useOwnBest("rocas", "ANA"));
    expect(result.current).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current).toEqual({ status: "ready", best }));
    expect(mocks.fetchOwnBest).toHaveBeenCalledWith({}, "rocas", "ANA");
  });

  it("returns ready with null when the user has no score", async () => {
    mocks.fetchOwnBest.mockResolvedValue(null);
    const { result } = renderHook(() => useOwnBest("rocas", "ANA"));
    await waitFor(() => expect(result.current).toEqual({ status: "ready", best: null }));
  });

  it("returns error when the query rejects", async () => {
    mocks.fetchOwnBest.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useOwnBest("rocas", "ANA"));
    await waitFor(() => expect(result.current).toEqual({ status: "error" }));
  });

  it("logs the failure before returning error", async () => {
    const error = new Error("boom");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.fetchOwnBest.mockRejectedValue(error);
    const { result } = renderHook(() => useOwnBest("rocas", "ANA"));
    await waitFor(() => expect(result.current).toEqual({ status: "error" }));
    expect(spy).toHaveBeenCalledWith("useOwnBest failed", error);
    spy.mockRestore();
  });

  it("returns error when the client cannot be created", async () => {
    mocks.createClient.mockImplementation(() => {
      throw new Error("no env");
    });
    const { result } = renderHook(() => useOwnBest("rocas", "ANA"));
    await waitFor(() => expect(result.current).toEqual({ status: "error" }));
  });

  it("ignores a stale result after the game changes", async () => {
    let resolveFirst!: (value: typeof best) => void;
    const other = { score: 7, date: "10/05/2026", rank: 1 };
    mocks.fetchOwnBest
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce(other);
    const { result, rerender } = renderHook(({ game }) => useOwnBest(game, "ANA"), {
      initialProps: { game: "rocas" },
    });
    rerender({ game: "caida" });
    await waitFor(() => expect(result.current).toEqual({ status: "ready", best: other }));
    await act(async () => {
      resolveFirst(best);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(result.current).toEqual({ status: "ready", best: other });
  });
});
