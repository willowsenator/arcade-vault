import { describe, expect, it } from "vitest";
import { config } from "./middleware";

describe("middleware config.matcher", () => {
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
