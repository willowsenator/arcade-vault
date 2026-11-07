import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const css = readFileSync(path.resolve(import.meta.dirname, "globals.css"), "utf8");
const ruleBody = (selector: string) =>
  css.match(new RegExp(`(?:^|\\n)${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`))?.[1] ?? "";

describe("player screen sizing", () => {
  it("caps the CRT width by the visible height so the 4:3 screen fits without scrolling", () => {
    expect(ruleBody(".crt")).toMatch(/max-width:[^;]*100dvh/);
  });

  it("centres the capped CRT and keeps the 4:3 screen", () => {
    expect(ruleBody(".crt")).toMatch(/margin-inline:\s*auto/);
    expect(ruleBody(".crt-screen")).toMatch(/aspect-ratio:\s*4\s*\/\s*3/);
  });

  it("never lets the cap shrink the screen below a usable width", () => {
    expect(ruleBody(".crt")).toMatch(/max-width:\s*max\(/);
  });
});
