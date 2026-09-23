import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createBrowserClientMock = vi.fn(() => ({ __client: "browser" }));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: createBrowserClientMock,
}));

const { createClient } = await import("./client");

describe("createClient (browser)", () => {
  beforeEach(() => {
    createBrowserClientMock.mockClear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a browser client with the configured URL and key", () => {
    createClient();
    expect(createBrowserClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-publishable-key",
    );
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(() => createClient()).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL is not configured",
    );
  });

  it("throws when NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(() => createClient()).toThrow(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured",
    );
  });
});
