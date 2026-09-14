import { beforeEach, describe, expect, it } from "vitest";
import { getSavedScores, saveScore } from "./scores";

describe("saveScore", () => {
  beforeEach(() => localStorage.clear());

  it("appends an entry with a timestamp to av_scores", () => {
    saveScore({ game: "caida", score: 1000, name: "PX_KAI" });
    const all = getSavedScores();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      game: "caida",
      score: 1000,
      name: "PX_KAI",
    });
    expect(typeof all[0].at).toBe("number");
  });

  it("appends to existing entries rather than overwriting", () => {
    saveScore({ game: "caida", score: 1000, name: "PX_KAI" });
    saveScore({ game: "serpentina", score: 500, name: "NEONFOX" });
    expect(getSavedScores()).toHaveLength(2);
  });

  it("returns an empty list when stored scores are not an array", () => {
    localStorage.setItem("av_scores", JSON.stringify({ score: 1000 }));
    expect(getSavedScores()).toEqual([]);
  });
});
