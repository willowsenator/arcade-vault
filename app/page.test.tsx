import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import Home from "./page";
import { GAMES, RECENT_TICKER_GAMES } from "@/lib/data";
import { TOP_PLAYERS_SIZE } from "@/lib/score-queries";
import { fakeClient } from "@/lib/score-queries.testing";

const mocks = vi.hoisted(() => ({ withScores: vi.fn() }));

vi.mock("@/lib/load-scores", () => ({ withScores: mocks.withScores }));

describe("home route", () => {
  beforeEach(() => {
    mocks.withScores.mockReset();
  });

  it("loads stats, recent top scores and top players and passes them to the screen", async () => {
    const { client, queries } = fakeClient((query) =>
      query.table === "game_stats"
        ? { data: [{ game: GAMES[0].id, best: "10", plays: "2" }] }
        : { data: [{ name: "ANA", score: 10, created_at: new Date(2026, 4, 9, 12).toISOString(), game: GAMES[0].id }] },
    );
    mocks.withScores.mockImplementation((load: (c: typeof client) => Promise<unknown>) => load(client));

    const element = (await Home()) as ReactElement<Record<string, unknown>>;

    expect(element.props.stats).toEqual({ [GAMES[0].id]: { best: 10, plays: 2 } });
    const recent = element.props.recent as Record<string, unknown[]>;
    expect(Object.keys(recent)).toEqual(GAMES.slice(0, RECENT_TICKER_GAMES).map((game) => game.id));
    expect(recent[GAMES[0].id]).toEqual([{ rank: 1, name: "ANA", score: 10, date: "09/05/2026" }]);
    const recentQueries = queries.filter((query) =>
      query.calls.some((call) => call.method === "eq" && call.args[0] === "game"),
    );
    expect(recentQueries.map((query) => query.calls.find((call) => call.method === "eq")?.args[1])).toEqual(
      GAMES.slice(0, RECENT_TICKER_GAMES).map((game) => game.id),
    );
    for (const query of recentQueries) {
      expect(query.calls.filter((call) => call.method === "limit").map((call) => call.args[0])).toEqual([1]);
    }
    expect(element.props.topPlayers).toHaveLength(1);
    expect(
      queries.some((query) =>
        query.calls.some((call) => call.method === "limit" && call.args[0] === TOP_PLAYERS_SIZE),
      ),
    ).toBe(true);
  });

  it("passes three nulls when the scores cannot be loaded", async () => {
    mocks.withScores.mockResolvedValue(null);
    const element = (await Home()) as ReactElement<Record<string, unknown>>;
    expect(element.props.stats).toBeNull();
    expect(element.props.recent).toBeNull();
    expect(element.props.topPlayers).toBeNull();
  });
});
