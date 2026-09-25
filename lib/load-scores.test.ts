import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.hoisted(() => vi.fn());
const cookiesMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("@/utils/supabase/server", () => ({ createClient: createClientMock }));

const { withScores, LOAD_TIMEOUT_MS } = await import("./load-scores");

describe("withScores", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createClientMock.mockReset();
    cookiesMock.mockReset().mockResolvedValue({ __cookies: true });
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes the server client to the loader and returns its result", async () => {
    const client = { __client: true };
    createClientMock.mockReturnValue(client);
    const load = vi.fn(async () => "rows");
    expect(await withScores(load)).toBe("rows");
    expect(load).toHaveBeenCalledWith(client);
    expect(createClientMock).toHaveBeenCalledWith({ __cookies: true });
  });

  it("returns null and logs when the client cannot be created (Supabase unset)", async () => {
    const failure = new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
    createClientMock.mockImplementation(() => {
      throw failure;
    });
    const load = vi.fn(async () => "rows");
    expect(await withScores(load)).toBeNull();
    expect(load).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Scores unavailable:", failure);
  });

  it("propagates a rejection from cookies() instead of reporting a scores failure", async () => {
    const signal = Object.assign(new Error("Dynamic server usage"), { digest: "DYNAMIC_SERVER_USAGE" });
    cookiesMock.mockRejectedValue(signal);
    const load = vi.fn(async () => "rows");
    await expect(withScores(load)).rejects.toBe(signal);
    expect(load).not.toHaveBeenCalled();
    expect(createClientMock).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns null and logs when the loader rejects", async () => {
    const failure = new Error("boom");
    createClientMock.mockReturnValue({});
    expect(await withScores(async () => { throw failure; })).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith("Scores unavailable:", failure);
  });

  it("returns null and logs when the loader never settles within the load timeout", async () => {
    vi.useFakeTimers();
    createClientMock.mockReturnValue({});
    const result = withScores(() => new Promise<never>(() => {}));
    await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS);
    expect(await result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith("Scores unavailable:", expect.any(Error));
    vi.useRealTimers();
  });
});
