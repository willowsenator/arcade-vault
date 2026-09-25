import { afterEach, describe, expect, it, vi } from "vitest";
import { LOAD_TIMEOUT_MS } from "@/lib/with-timeout";

// Node's AbortSignal.timeout ignores fake timers, so shrink the real timeout instead.
vi.mock("@/lib/with-timeout", () => ({ LOAD_TIMEOUT_MS: 20 }));

const supabase = vi.hoisted(() => ({ createClient: vi.fn(() => ({ from: () => ({}) })) }));
vi.mock("@supabase/supabase-js", () => supabase);

const { createPublicClient } = await import("./public");

async function signalHandedToFetch(upstream?: AbortSignal) {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "key");
  createPublicClient();
  const [, , options] = supabase.createClient.mock.calls[0] as unknown as [
    string,
    string,
    { global: { fetch: typeof fetch } },
  ];
  await options.global.fetch("https://example.supabase.co/rest/v1/x", { signal: upstream });
  return vi.mocked(fetch).mock.calls[0][1]?.signal as AbortSignal;
}

describe("createPublicClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    supabase.createClient.mockClear();
  });

  it("throws when the Supabase URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "key");
    expect(() => createPublicClient()).toThrow("NEXT_PUBLIC_SUPABASE_URL is not configured");
  });

  it("throws when the publishable key is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(() => createPublicClient()).toThrow("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured");
  });

  it("creates a cookie-free client without a persisted or refreshed session", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "key");
    createPublicClient();
    expect(supabase.createClient).toHaveBeenCalledOnce();
    expect(supabase.createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "key",
      expect.objectContaining({ auth: { persistSession: false, autoRefreshToken: false } }),
    );
  });

  it("aborts a request that outlives the load timeout", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const signal = await signalHandedToFetch();
    expect(signal.aborted).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, LOAD_TIMEOUT_MS + 50));
    expect(signal.aborted).toBe(true);
    expect((signal.reason as Error).name).toBe("TimeoutError");
  });

  it("propagates an upstream abort", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const upstream = new AbortController();
    const signal = await signalHandedToFetch(upstream.signal);
    expect(signal).not.toBe(upstream.signal);
    expect(signal.aborted).toBe(false);
    upstream.abort();
    expect(signal.aborted).toBe(true);
  });

  it("attaches a timeout signal to a request that carries none", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "key");
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    createPublicClient();
    const [, , options] = supabase.createClient.mock.calls[0] as unknown as [
      string,
      string,
      { global: { fetch: typeof fetch } },
    ];
    await options.global.fetch("https://example.supabase.co/rest/v1/x");
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
