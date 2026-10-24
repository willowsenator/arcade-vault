import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { GAMES, CATS } from "./data";

describe("data", () => {
  it("GAMES has 8 unique ids", () => {
    expect(GAMES).toHaveLength(8);
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(8);
  });

  it("CATS includes TODOS plus every game category", () => {
    expect(CATS).toContain("TODOS");
    for (const g of GAMES) expect(CATS).toContain(g.cat);
  });

  it("engine ids are rocas → asteroids and bloque-buster → bloque-buster", () => {
    expect(Object.fromEntries(GAMES.filter((g) => g.engine).map((g) => [g.id, g.engine]))).toEqual({
      rocas: "asteroids",
      "bloque-buster": "bloque-buster",
    });
  });

  it("does not claim bloque-buster levels rearrange the wall", () => {
    expect(GAMES.find((g) => g.id === "bloque-buster")!.long).not.toMatch(/patrones/i);
  });

  it("keeps the bricks cover rule", () => {
    expect(readFileSync(path.resolve(import.meta.dirname, "../app/globals.css"), "utf8")).toMatch(/\.cover-bricks\s*\{/);
  });

  it("describes rocas by its real mechanics, not features the game lacks", () => {
    const rocas = GAMES.find((g) => g.id === "rocas")!;
    expect(rocas.long).not.toMatch(/ovni/i);
    expect(rocas.long).toMatch(/escudo/i);
    expect(rocas.long).toMatch(/triple/i);
  });
});
