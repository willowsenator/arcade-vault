import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchGameStats,
  fetchOwnBest,
  fetchTopPlayers,
  fetchTopScores,
  fetchTopScoresByGame,
  formatScoreDate,
  insertScore,
  SAVE_TIMEOUT_MS,
} from "./score-queries";
import { fakeClient, type Query } from "./score-queries.testing";

const at = new Date(2026, 4, 9, 12).toISOString();

const hasCall = (query: Query, method: string) => query.calls.some((call) => call.method === method);
const argOf = (query: Query, method: string, index: number) =>
  query.calls.find((call) => call.method === method)?.args[index];

const RANKING_ORDER = [
  { method: "order", args: ["score", { ascending: false }] },
  { method: "order", args: ["created_at", { ascending: true }] },
];

describe("formatScoreDate", () => {
  it("zero-pads day and month in local time", () => {
    expect(formatScoreDate(new Date(2026, 4, 9, 12).toISOString())).toBe("09/05/2026");
  });

  it("keeps two-digit day and month", () => {
    expect(formatScoreDate(new Date(2026, 11, 31, 12).toISOString())).toBe("31/12/2026");
  });
});

describe("insertScore", () => {
  afterEach(() => vi.useRealTimers());

  it("rejects when the insert never settles within the save timeout", async () => {
    vi.useFakeTimers();
    const client = {
      from: () => ({ insert: () => new Promise<never>(() => {}) }),
    } as unknown as Parameters<typeof insertScore>[0];
    const assertion = expect(
      insertScore(client, { game: "rocas", name: "ANA", score: 1 }),
    ).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(SAVE_TIMEOUT_MS);
    await assertion;
  });

  it("inserts the game, name and score", async () => {
    const { client, queries } = fakeClient(() => ({}));
    await insertScore(client, { game: "rocas", name: "ANA", score: 0 });
    expect(queries[0].table).toBe("scores");
    expect(queries[0].calls).toEqual([
      { method: "insert", args: [{ game: "rocas", name: "ANA", score: 0 }] },
    ]);
  });

  it("throws the database message when the insert is rejected", async () => {
    const { client } = fakeClient(() => ({ error: { message: "violates check constraint" } }));
    await expect(insertScore(client, { game: "rocas", name: "ANA", score: 1 })).rejects.toThrow(
      "violates check constraint",
    );
  });
});

describe("fetchTopScores", () => {
  it("orders by score descending then earlier first, limits, and maps rows with ranks", async () => {
    const { client, queries } = fakeClient(() => ({
      data: [
        { name: "A", score: 900, created_at: at },
        { name: "B", score: 800, created_at: at },
      ],
    }));
    const rows = await fetchTopScores(client, "rocas", 12);
    expect(queries[0].calls).toEqual([
      { method: "select", args: ["name,score,created_at"] },
      { method: "eq", args: ["game", "rocas"] },
      ...RANKING_ORDER,
      { method: "limit", args: [12] },
    ]);
    expect(rows).toEqual([
      { rank: 1, name: "A", score: 900, date: "09/05/2026" },
      { rank: 2, name: "B", score: 800, date: "09/05/2026" },
    ]);
  });

  it("returns an empty list when there are no scores", async () => {
    expect(await fetchTopScores(fakeClient(() => ({ data: [] })).client, "rocas", 5)).toEqual([]);
  });

  it("returns an empty list when the data is null", async () => {
    expect(await fetchTopScores(fakeClient(() => ({ data: null })).client, "rocas", 5)).toEqual([]);
  });

  it("throws the database message on error", async () => {
    const failing = fakeClient(() => ({ error: { message: "boom" } })).client;
    await expect(fetchTopScores(failing, "rocas", 5)).rejects.toThrow("boom");
  });
});

describe("fetchTopScoresByGame", () => {
  it("returns one list per requested game and forwards the limit", async () => {
    const { client, queries } = fakeClient((query) => ({
      data: [{ name: argOf(query, "eq", 1), score: 1, created_at: at }],
    }));
    const result = await fetchTopScoresByGame(client, ["rocas", "caida"], 3);
    expect(Object.keys(result)).toEqual(["rocas", "caida"]);
    expect(result.caida[0].name).toBe("caida");
    for (const query of queries) expect(argOf(query, "limit", 0)).toBe(3);
  });

  it("returns an empty record for no games", async () => {
    expect(await fetchTopScoresByGame(fakeClient(() => ({})).client, [], 1)).toEqual({});
  });

  it("rejects when one game fails", async () => {
    const { client } = fakeClient((query) =>
      argOf(query, "eq", 1) === "caida" ? { error: { message: "boom" } } : { data: [] },
    );
    await expect(fetchTopScoresByGame(client, ["rocas", "caida"], 1)).rejects.toThrow("boom");
  });
});

describe("fetchGameStats", () => {
  it("maps the view rows by game and converts counts to numbers", async () => {
    const { client, queries } = fakeClient(() => ({
      data: [{ game: "rocas", best: "1500", plays: "3" }],
    }));
    expect(await fetchGameStats(client)).toEqual({ rocas: { best: 1500, plays: 3 } });
    expect(queries[0].table).toBe("game_stats");
    expect(queries[0].calls).toEqual([{ method: "select", args: ["game,best,plays"] }]);
  });

  it("returns an empty record for an empty view and throws on error", async () => {
    expect(await fetchGameStats(fakeClient(() => ({ data: [] })).client)).toEqual({});
    const failing = fakeClient(() => ({ error: { message: "boom" } })).client;
    await expect(fetchGameStats(failing)).rejects.toThrow("boom");
  });
});

describe("fetchTopPlayers", () => {
  it("returns the highest scores across games, best first", async () => {
    const { client, queries } = fakeClient(() => ({
      data: [{ name: "ANA", score: 50, game: "rocas" }],
    }));
    expect(await fetchTopPlayers(client, 5)).toEqual([{ name: "ANA", score: 50, game: "rocas" }]);
    expect(queries[0].calls).toEqual([
      { method: "select", args: ["name,score,game"] },
      ...RANKING_ORDER,
      { method: "limit", args: [5] },
    ]);
  });

  it("returns an empty list when there are no scores and throws on error", async () => {
    expect(await fetchTopPlayers(fakeClient(() => ({ data: [] })).client, 5)).toEqual([]);
    const failing = fakeClient(() => ({ error: { message: "boom" } })).client;
    await expect(fetchTopPlayers(failing, 5)).rejects.toThrow("boom");
  });
});

describe("fetchOwnBest", () => {
  const bestRow = { data: [{ score: 500, created_at: at }] };

  it("returns null when the name has no score in the game", async () => {
    const { client } = fakeClient(() => ({ data: [] }));
    expect(await fetchOwnBest(client, "rocas", "ana")).toBeNull();
  });

  it("looks the name up upper-cased and ranks after strictly higher and earlier equal scores", async () => {
    const { client, queries } = fakeClient((query) => {
      if (hasCall(query, "limit")) return bestRow;
      return { count: hasCall(query, "lt") ? 2 : 4 };
    });
    const best = await fetchOwnBest(client, "rocas", "ana");
    expect(queries[0].calls).toContainEqual({ method: "eq", args: ["name", "ANA"] });
    expect(best).toEqual({ score: 500, date: "09/05/2026", rank: 7 });
  });

  it("counts strictly higher scores and earlier equal scores in the same game", async () => {
    const { client, queries } = fakeClient((query) => (hasCall(query, "limit") ? bestRow : { count: 0 }));
    await fetchOwnBest(client, "rocas", "ANA");
    const counts = queries.slice(1);
    expect(counts).toHaveLength(2);
    const countSelect = { method: "select", args: ["id", { count: "exact", head: true }] };
    expect(counts.find((query) => hasCall(query, "gt"))?.calls).toEqual([
      countSelect,
      { method: "eq", args: ["game", "rocas"] },
      { method: "gt", args: ["score", 500] },
    ]);
    expect(counts.find((query) => hasCall(query, "lt"))?.calls).toEqual([
      countSelect,
      { method: "eq", args: ["game", "rocas"] },
      { method: "eq", args: ["score", 500] },
      { method: "lt", args: ["created_at", at] },
    ]);
  });

  it("ranks a score of zero like any other", async () => {
    const { client } = fakeClient((query) =>
      hasCall(query, "limit") ? { data: [{ score: 0, created_at: at }] } : { count: 0 },
    );
    expect((await fetchOwnBest(client, "rocas", "ANA"))?.rank).toBe(1);
  });

  it("treats a null count as zero", async () => {
    const { client } = fakeClient((query) => (hasCall(query, "limit") ? bestRow : { count: null }));
    expect((await fetchOwnBest(client, "rocas", "ANA"))?.rank).toBe(1);
  });

  it("rejects when the best-score lookup fails", async () => {
    const { client } = fakeClient(() => ({ error: { message: "lookup failed" } }));
    await expect(fetchOwnBest(client, "rocas", "ANA")).rejects.toThrow("lookup failed");
  });

  it.each(["gt", "lt"])("rejects when the %s count query fails", async (method) => {
    const { client } = fakeClient((query) => {
      if (hasCall(query, "limit")) return bestRow;
      return hasCall(query, method) ? { error: { message: "count failed" } } : { count: 0 };
    });
    await expect(fetchOwnBest(client, "rocas", "ANA")).rejects.toThrow("count failed");
  });
});
