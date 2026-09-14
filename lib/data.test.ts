import { describe, it, expect } from "vitest";
import { GAMES, CATS, seededScores } from "./data";

describe("data", () => {
  it("GAMES has 8 unique ids", () => {
    expect(GAMES).toHaveLength(8);
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(8);
  });

  it("CATS includes TODOS plus every game category", () => {
    expect(CATS).toContain("TODOS");
    for (const g of GAMES) expect(CATS).toContain(g.cat);
  });
});

describe("seededScores", () => {
  it("is deterministic for a given seed", () => {
    expect(seededScores(42, 5)).toEqual(seededScores(42, 5));
  });

  it("returns count rows sorted by score descending with sequential ranks", () => {
    const rows = seededScores(7, 10);
    expect(rows).toHaveLength(10);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].score).toBeGreaterThanOrEqual(rows[i].score);
    }
  });
});
