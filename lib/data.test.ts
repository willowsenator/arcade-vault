import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { GAMES, CATS } from "./data";

describe("data", () => {
  it("GAMES lists only the games that have an engine", () => {
    expect(GAMES.map((g) => g.id)).toEqual(["bloque-buster", "caida", "serpentina", "rocas"]);
  });

  it("CATS is TODOS plus only the categories that have a game", () => {
    expect(CATS).toEqual(["TODOS", "ARCADE", "PUZZLE", "SHOOTER"]);
  });

  it("ships no cover rule for a removed game", () => {
    const css = readFileSync(path.resolve(import.meta.dirname, "../app/globals.css"), "utf8");
    for (const cover of ["cover-glot", "cover-invaders", "cover-rana", "cover-duelo"]) {
      expect(css).not.toContain(cover);
    }
  });

  it("engine ids map rocas, bloque-buster, serpentina and caida to their engines", () => {
    expect(Object.fromEntries(GAMES.map((g) => [g.id, g.engine]))).toEqual({
      rocas: "asteroids",
      "bloque-buster": "bloque-buster",
      serpentina: "snake",
      caida: "tetris",
    });
  });

  it("does not claim bloque-buster levels rearrange the wall", () => {
    expect(GAMES.find((g) => g.id === "bloque-buster")!.long).not.toMatch(/patrones/i);
  });

  it("keeps the bricks cover rule", () => {
    expect(readFileSync(path.resolve(import.meta.dirname, "../app/globals.css"), "utf8")).toMatch(/\.cover-bricks\s*\{/);
  });

  it("keeps the snake cover rule", () => {
    expect(readFileSync(path.resolve(import.meta.dirname, "../app/globals.css"), "utf8")).toMatch(/\.cover-snake\s*\{/);
  });

  it("keeps a cover rule in the stylesheet for the caida catalog cover", () => {
    const caida = GAMES.find((g) => g.id === "caida")!;
    const css = readFileSync(path.resolve(import.meta.dirname, "../app/globals.css"), "utf8");
    expect(css).toMatch(new RegExp(`\\.${caida.cover}\\s*\\{`));
  });

  it("describes rocas by its real mechanics, not features the game lacks", () => {
    const rocas = GAMES.find((g) => g.id === "rocas")!;
    expect(rocas.long).not.toMatch(/ovni/i);
    expect(rocas.long).toMatch(/escudo/i);
    expect(rocas.long).toMatch(/triple/i);
  });
});
