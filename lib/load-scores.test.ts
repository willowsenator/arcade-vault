import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.fn();
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ __cookies: true })) }));
vi.mock("@/utils/supabase/server", () => ({ createClient: createClientMock }));

const { withScores } = await import("./load-scores");

describe("withScores", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createClientMock.mockReset();
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

  it("returns null and logs when the loader rejects", async () => {
    const failure = new Error("boom");
    createClientMock.mockReturnValue({});
    expect(await withScores(async () => { throw failure; })).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith("Scores unavailable:", failure);
  });
});
