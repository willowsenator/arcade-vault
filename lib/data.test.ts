import { describe, it, expect } from "vitest";
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

  it("marks exactly one game as the asteroids engine, and it is rocas", () => {
    const playable = GAMES.filter((g) => g.engine === "asteroids");
    expect(playable.map((g) => g.id)).toEqual(["rocas"]);
  });

  it("describes rocas by its real mechanics, not features the game lacks", () => {
    const rocas = GAMES.find((g) => g.id === "rocas")!;
    expect(rocas.long).not.toMatch(/ovni/i);
    expect(rocas.long).toMatch(/escudo/i);
    expect(rocas.long).toMatch(/triple/i);
  });
});
