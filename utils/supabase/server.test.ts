import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createServerClientMock = vi.fn((_url, _key, options) => ({
  __client: "server",
  __cookies: options.cookies,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) =>
    createServerClientMock(
      args[0] as string,
      args[1] as string,
      args[2] as { cookies: unknown },
    ),
}));

const { createClient } = await import("./server");

function makeCookieStore(overrides: Partial<{ set: ReturnType<typeof vi.fn> }> = {}) {
  return {
    getAll: vi.fn(() => [{ name: "sb-session", value: "abc" }]),
    set: vi.fn(),
    ...overrides,
  };
}

describe("createClient (server)", () => {
  beforeEach(() => {
    createServerClientMock.mockClear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a server client with the configured URL and key", () => {
    const client = createClient(makeCookieStore() as never);
    expect(createServerClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-publishable-key",
      expect.any(Object),
    );
    expect(client).toBe(createServerClientMock.mock.results[0].value);
  });

  it("delegates cookies.getAll() to the cookie store", () => {
    const cookieStore = makeCookieStore();
    createClient(cookieStore as never);
    const { cookies } = createServerClientMock.mock.calls[0][2];
    expect(cookies.getAll()).toEqual(cookieStore.getAll());
  });

  it("delegates cookies.setAll() to cookieStore.set() for each cookie", () => {
    const cookieStore = makeCookieStore();
    createClient(cookieStore as never);
    const { cookies } = createServerClientMock.mock.calls[0][2];
    cookies.setAll([{ name: "sb-session", value: "xyz", options: { path: "/" } }]);
    expect(cookieStore.set).toHaveBeenCalledWith("sb-session", "xyz", { path: "/" });
  });

  it("swallows errors from cookieStore.set (Server Component write attempt)", () => {
    const cookieStore = makeCookieStore({
      set: vi.fn(() => {
        throw new Error("cookies can only be modified in a Server Action or Route Handler");
      }),
    });
    createClient(cookieStore as never);
    const { cookies } = createServerClientMock.mock.calls[0][2];
    expect(() =>
      cookies.setAll([{ name: "sb-session", value: "xyz", options: {} }]),
    ).not.toThrow();
  });
});
