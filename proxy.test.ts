import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const updateSessionMock = vi.fn();

vi.mock("@/utils/supabase/middleware", () => ({
  updateSession: updateSessionMock,
}));

const { config, proxy } = await import("./proxy");

describe("proxy config.matcher", () => {
  // Next.js anchors matcher patterns to the full path internally; anchor
  // here too, or an unanchored RegExp.test() can restart matching at a
  // later "/" in the path and silently bypass the exclusion.
  const pattern = new RegExp(`^${config.matcher[0]}`);

  it("matches an ordinary app route", () => {
    expect(pattern.test("/biblioteca")).toBe(true);
  });

  it("matches the root route", () => {
    expect(pattern.test("/")).toBe(true);
  });

  it("excludes _next/static assets", () => {
    expect(pattern.test("/_next/static/chunk.js")).toBe(false);
  });

  it("excludes _next/image assets", () => {
    expect(pattern.test("/_next/image?url=%2Flogo.png")).toBe(false);
  });

  it("excludes favicon.ico", () => {
    expect(pattern.test("/favicon.ico")).toBe(false);
  });

  it("excludes image files", () => {
    expect(pattern.test("/logo.png")).toBe(false);
  });
});

describe("proxy", () => {
  beforeEach(() => {
    updateSessionMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns updateSession's response when it succeeds", async () => {
    const sessionResponse = NextResponse.next();
    updateSessionMock.mockResolvedValue(sessionResponse);

    const request = new NextRequest("http://localhost/biblioteca");
    const response = await proxy(request);

    expect(response).toBe(sessionResponse);
  });

  it("lets the request through instead of failing the whole site when Supabase env vars are missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    updateSessionMock.mockRejectedValue(
      new Error("NEXT_PUBLIC_SUPABASE_URL is not configured"),
    );

    const request = new NextRequest("http://localhost/biblioteca");
    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(console.error).toHaveBeenCalledWith(
      "Supabase session refresh skipped:",
      expect.any(Error),
    );
  });
});
