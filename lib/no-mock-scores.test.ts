import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry) && !/\.testing\./.test(entry) ? [full] : [];
  });
}

describe("application source", () => {
  const files = ["app", "components", "lib", "utils"].flatMap((dir) => sourceFiles(path.join(root, dir)));

  it("has no mock score generator or local score storage", () => {
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toContain("seededScores");
      expect(text, file).not.toContain("av_scores");
    }
  });

  it("has no static best or plays values on games", () => {
    const data = readFileSync(path.join(root, "lib/data.ts"), "utf8");
    expect(data).not.toMatch(/\bbest:/);
    expect(data).not.toMatch(/\bplays:/);
  });

  it("has no mock player", () => {
    const player = readFileSync(path.join(root, "components/screens/PlayerScreen.tsx"), "utf8");
    expect(player).not.toContain("game-arena");
    expect(player).not.toContain("playable");
    expect(player).not.toContain("Math.random");
    const css = readFileSync(path.join(root, "app/globals.css"), "utf8");
    expect(css).not.toContain(".game-arena");
  });
});
