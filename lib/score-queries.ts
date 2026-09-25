import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScoreRow } from "./data";
import { withTimeout } from "./with-timeout";

export type ScoresClient = Pick<SupabaseClient, "from">;
export type ScoreInput = { game: string; name: string; score: number };
export type GameStats = { best: number; plays: number };
export type OwnBest = { score: number; date: string; rank: number };
export type TopPlayer = { name: string; score: number; game: string };

export const LEADERBOARD_SIZE = 12;
export const DETAIL_SIZE = 10;
export const TOP_PLAYERS_SIZE = 5;
export const SAVE_TIMEOUT_MS = 10_000;

type Failure = { message: string } | null;
type ScoreRecord = { name: string; score: number; created_at: string };

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatScoreDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function throwOn(error: Failure): void {
  if (error) throw new Error(error.message);
}

// Best score first; equal scores rank the earlier submission first.
function byRanking<T extends { order: (column: string, options: { ascending: boolean }) => T }>(
  query: T,
): T {
  return query.order("score", { ascending: false }).order("created_at", { ascending: true });
}

export async function insertScore(client: ScoresClient, input: ScoreInput): Promise<void> {
  const { error } = await withTimeout(
    client.from("scores").insert({ game: input.game, name: input.name, score: input.score }),
    SAVE_TIMEOUT_MS,
  );
  throwOn(error);
}

export async function fetchTopScores(
  client: ScoresClient,
  game: string,
  limit: number,
): Promise<ScoreRow[]> {
  const { data, error } = await byRanking(
    client.from("scores").select("name,score,created_at").eq("game", game),
  ).limit(limit);
  throwOn(error);
  return ((data ?? []) as ScoreRecord[]).map((row, index) => ({
    rank: index + 1,
    name: row.name,
    score: row.score,
    date: formatScoreDate(row.created_at),
  }));
}

export async function fetchTopScoresByGame(
  client: ScoresClient,
  games: string[],
  limit: number,
): Promise<Record<string, ScoreRow[]>> {
  const entries = await Promise.all(
    games.map(async (game) => [game, await fetchTopScores(client, game, limit)] as const),
  );
  return Object.fromEntries(entries);
}

export async function fetchGameStats(client: ScoresClient): Promise<Record<string, GameStats>> {
  const { data, error } = await client.from("game_stats").select("game,best,plays");
  throwOn(error);
  const rows = (data ?? []) as { game: string; best: number | string; plays: number | string }[];
  return Object.fromEntries(
    rows.map((row) => [row.game, { best: Number(row.best), plays: Number(row.plays) }]),
  );
}

export async function fetchTopPlayers(client: ScoresClient, limit: number): Promise<TopPlayer[]> {
  const { data, error } = await byRanking(client.from("scores").select("name,score,game")).limit(limit);
  throwOn(error);
  return (data ?? []) as TopPlayer[];
}

async function countScores(
  query: PromiseLike<{ count: number | null; error: Failure }>,
): Promise<number> {
  const { count, error } = await query;
  throwOn(error);
  return count ?? 0;
}

function scoresInGame(client: ScoresClient, game: string) {
  return client.from("scores").select("id", { count: "exact", head: true }).eq("game", game);
}

async function rankOf(client: ScoresClient, game: string, best: Omit<ScoreRecord, "name">) {
  const [higher, earlierTies] = await Promise.all([
    countScores(scoresInGame(client, game).gt("score", best.score)),
    countScores(scoresInGame(client, game).eq("score", best.score).lt("created_at", best.created_at)),
  ]);
  return higher + earlierTies + 1;
}

export async function fetchOwnBest(
  client: ScoresClient,
  game: string,
  name: string,
): Promise<OwnBest | null> {
  const { data, error } = await byRanking(
    client.from("scores").select("score,created_at").eq("game", game).eq("name", name.toUpperCase()),
  ).limit(1);
  throwOn(error);
  const best = ((data ?? []) as Omit<ScoreRecord, "name">[])[0];
  if (!best) return null;
  return {
    score: best.score,
    date: formatScoreDate(best.created_at),
    rank: await rankOf(client, game, best),
  };
}
