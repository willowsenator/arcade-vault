import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import LeaderboardPage from "./page";
import { GAMES } from "@/lib/data";
import { LEADERBOARD_SIZE } from "@/lib/score-queries";

const mocks = vi.hoisted(() => ({ withScores: vi.fn(), fetchTopScoresByGame: vi.fn() }));
const client = { fake: true };

vi.mock("@/lib/load-scores", () => ({ withScores: mocks.withScores }));
vi.mock("@/lib/score-queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/score-queries")>()),
  fetchTopScoresByGame: mocks.fetchTopScoresByGame,
}));

describe("LeaderboardPage", () => {
  beforeEach(() => {
    mocks.withScores.mockReset();
    mocks.fetchTopScoresByGame.mockReset();
    mocks.withScores.mockImplementation((run: (c: unknown) => unknown) => run(client));
  });

  it("queries the top scores of every game and passes them as topByGame", async () => {
    const topByGame = { rocas: [{ rank: 1, name: "ANA", score: 5, date: "09/05/2026" }] };
    mocks.fetchTopScoresByGame.mockResolvedValue(topByGame);
    const element = (await LeaderboardPage()) as ReactElement<{ topByGame: unknown }>;
    expect(mocks.fetchTopScoresByGame).toHaveBeenCalledWith(
      client,
      GAMES.map((game) => game.id),
      LEADERBOARD_SIZE,
    );
    expect(element.props.topByGame).toBe(topByGame);
  });

  it("rejects when the scores are unavailable", async () => {
    const failure = new Error("scores down");
    mocks.withScores.mockRejectedValue(failure);
    await expect(LeaderboardPage()).rejects.toBe(failure);
  });
});
