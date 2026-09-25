import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import GameDetailPage, { generateStaticParams } from "./page";
import PlayerPage from "./play/page";
import { GAMES } from "@/lib/data";
import { DETAIL_SIZE } from "@/lib/score-queries";
import { fakeClient } from "@/lib/score-queries.testing";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  withScores: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/lib/load-scores", () => ({ withScores: mocks.withScores }));

const game = GAMES[0];
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("game routes", () => {
  beforeEach(() => {
    mocks.notFound.mockClear();
    mocks.withScores.mockReset();
  });

  it("prerenders a detail page for every catalog game", () => {
    expect(generateStaticParams()).toEqual(GAMES.map(({ id }) => ({ id })));
  });

  it("calls notFound for an unknown detail game id", async () => {
    await expect(GameDetailPage(params("does-not-exist"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
    expect(mocks.withScores).not.toHaveBeenCalled();
  });

  it("calls notFound for an unknown player game id", async () => {
    await expect(PlayerPage(params("does-not-exist"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("loads this game's stats and top scores and passes them to the screen", async () => {
    const { client, queries } = fakeClient((query) =>
      query.table === "game_stats"
        ? { data: [{ game: game.id, best: "10", plays: "2" }, { game: "otro", best: "99", plays: "9" }] }
        : { data: [{ name: "ANA", score: 10, created_at: new Date(2026, 4, 9, 12).toISOString() }] },
    );
    mocks.withScores.mockImplementation((load: (c: typeof client) => Promise<unknown>) => load(client));

    const element = (await GameDetailPage(params(game.id))) as ReactElement<Record<string, unknown>>;

    expect(element.props.game).toBe(game);
    expect(element.props.stats).toEqual({ best: 10, plays: 2 });
    expect(element.props.topScores).toEqual([{ rank: 1, name: "ANA", score: 10, date: "09/05/2026" }]);
    const scoresQuery = queries.find((query) => query.table === "scores")!;
    expect(queries.some((query) => query.table === "game_stats")).toBe(true);
    expect(scoresQuery.calls).toContainEqual({ method: "eq", args: ["game", game.id] });
    expect(scoresQuery.calls).toContainEqual({ method: "limit", args: [DETAIL_SIZE] });
  });

  it("passes no stats for a game that is missing from the stats view", async () => {
    const { client } = fakeClient((query) =>
      query.table === "game_stats"
        ? { data: [{ game: "otro", best: "99", plays: "9" }] }
        : { data: [{ name: "ANA", score: 5, created_at: new Date(2026, 4, 9, 12).toISOString() }] },
    );
    mocks.withScores.mockImplementation((load: (c: typeof client) => Promise<unknown>) => load(client));
    const element = (await GameDetailPage(params(game.id))) as ReactElement<Record<string, unknown>>;
    expect(element.props.stats).toBeNull();
    expect(element.props.topScores).toHaveLength(1);
  });

  it("rejects when the scores cannot be loaded", async () => {
    const failure = new Error("scores down");
    mocks.withScores.mockRejectedValue(failure);
    await expect(GameDetailPage(params(game.id))).rejects.toBe(failure);
  });
});
