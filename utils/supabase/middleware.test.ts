import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

let capturedCookies: {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookies: { name: string; value: string; options?: Record<string, unknown> }[],
  ) => void;
};

const createServerClientMock = vi.fn((_url: string, _key: string, options: {
  cookies: typeof capturedCookies;
}) => {
  capturedCookies = options.cookies;
  return {
    auth: {
      getUser: vi.fn(async () => {
        capturedCookies.setAll([
          { name: "sb-session", value: "refreshed", options: { path: "/" } },
        ]);
        return { data: { user: null }, error: null };
      }),
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
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("calls supabase.auth.getUser() to refresh the session", async () => {
    const request = new NextRequest("http://localhost/biblioteca");
    await updateSession(request);
    expect(createServerClientMock).toHaveBeenCalledTimes(1);
  });

  it("returns a response carrying cookies refreshed during getUser()", async () => {
    const request = new NextRequest("http://localhost/biblioteca");
    const response = await updateSession(request);
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const request = new NextRequest("http://localhost/biblioteca");
    await expect(updateSession(request)).rejects.toThrow(
      "NEXT_PUBLIC_SUPABASE_URL is not configured",
    );
  });
});
