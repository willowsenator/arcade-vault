import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOAD_TIMEOUT_MS } from "@/lib/with-timeout";

const createPublicClientMock = vi.hoisted(() => vi.fn());
vi.mock("@/utils/supabase/public", () => ({ createPublicClient: createPublicClientMock }));

const { withScores } = await import("./load-scores");

describe("withScores", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createPublicClientMock.mockReset();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("passes the public client to the loader and returns its result", async () => {
    const client = { __client: true };
    createPublicClientMock.mockReturnValue(client);
    const load = vi.fn(async () => "rows");
    expect(await withScores(load)).toBe("rows");
    expect(createPublicClientMock).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledWith(client);
  });

  it("rejects with the factory's error and logs it when the client cannot be created", async () => {
    const failure = new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
    createPublicClientMock.mockImplementation(() => {
      throw failure;
    });
    const load = vi.fn(async () => "rows");
    await expect(withScores(load)).rejects.toBe(failure);
    expect(load).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Scores unavailable:", failure);
  });

  it("rejects with the loader's error and logs it", async () => {
    const failure = new Error("boom");
    createPublicClientMock.mockReturnValue({});
    await expect(withScores(async () => { throw failure; })).rejects.toBe(failure);
    expect(errorSpy).toHaveBeenCalledWith("Scores unavailable:", failure);
  });

  it("does not reject or log before the load timeout elapses", async () => {
    vi.useFakeTimers();
    createPublicClientMock.mockReturnValue({});
    const settled = vi.fn();
    const result = withScores(() => new Promise<never>(() => {}));
    result.catch(settled);
    await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS - 1);
    expect(settled).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    const assertion = expect(result).rejects.toThrow(`timed out after ${LOAD_TIMEOUT_MS} ms`);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
  });

  it("rejects with the timeout error when the loader never settles within the load timeout", async () => {
    vi.useFakeTimers();
    createPublicClientMock.mockReturnValue({});
    const result = withScores(() => new Promise<never>(() => {}));
    const assertion = expect(result).rejects.toThrow(`timed out after ${LOAD_TIMEOUT_MS} ms`);
    await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS);
    await assertion;
    expect(errorSpy).toHaveBeenCalledWith("Scores unavailable:", expect.any(Error));
  });
});
