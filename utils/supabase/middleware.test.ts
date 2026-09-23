import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

let capturedCookies: {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookies: { name: string; value: string; options?: Record<string, unknown> }[],
    headers?: Record<string, string>,
  ) => void;
};

const getUserMock = vi.fn(async () => {
  capturedCookies.setAll(
    [{ name: "sb-session", value: "refreshed", options: { path: "/" } }],
    { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0" },
  );
  return { data: { user: null }, error: null };
});

const createServerClientMock = vi.fn((_url: string, _key: string, options: {
  cookies: typeof capturedCookies;
}) => {
  capturedCookies = options.cookies;
  return {
    auth: {
      getUser: getUserMock,
    },
  };
});

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) =>
    createServerClientMock(
      args[0] as string,
      args[1] as string,
      args[2] as { cookies: typeof capturedCookies },
    ),
}));

const { updateSession } = await import("./middleware");

describe("updateSession", () => {
  beforeEach(() => {
    createServerClientMock.mockClear();
    getUserMock.mockClear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("calls supabase.auth.getUser() to refresh the session", async () => {
    const request = new NextRequest("http://localhost/biblioteca");
    await updateSession(request);
    expect(getUserMock).toHaveBeenCalledTimes(1);
  });

  it("returns a response carrying cookies refreshed during getUser()", async () => {
    const request = new NextRequest("http://localhost/biblioteca");
    const response = await updateSession(request);
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
  });

  it("forwards the anti-caching headers supabase passes alongside refreshed cookies", async () => {
    const request = new NextRequest("http://localhost/biblioteca");
    const response = await updateSession(request);
    expect(response.headers.get("Cache-Control")).toBe(
      "private, no-cache, no-store, must-revalidate, max-age=0",
    );
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const request = new NextRequest("http://localhost/biblioteca");
    await expect(updateSession(request)).rejects.toThrow(
      "NEXT_PUBLIC_SUPABASE_URL is not configured",
    );
  });
});
