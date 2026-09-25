// These are text checks on the migration file; no test runs the SQL against Postgres.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GAMES } from "./data";

const migration = readFileSync(
  path.resolve(import.meta.dirname, "../supabase/migrations/20260924120000_scores.sql"),
  "utf8",
)
  .replace(/--.*$/gm, "")
  .replace(/\s+/g, " ");

const grants = migration.match(/grant [^;]+;/gi) ?? [];

describe("scores migration", () => {
  it("seeds exactly the catalog games", () => {
    const block = migration.match(/insert into public\.games \(id\) values ([^;]+);/i)?.[1] ?? "";
    const seeded = [...block.matchAll(/\('([^']+)'\)/g)].map((match) => match[1]);
    expect(new Set(seeded)).toEqual(new Set(GAMES.map((game) => game.id)));
    expect(seeded).toHaveLength(GAMES.length);
  });

  it("enables row level security on both tables", () => {
    expect(migration).toMatch(/alter table public\.games enable row level security/i);
    expect(migration).toMatch(/alter table public\.scores enable row level security/i);
  });

  it("revokes every default privilege before granting the explicit ones", () => {
    const revoke = migration.search(
      /revoke all on public\.games, public\.scores, public\.game_stats from anon, authenticated;/i,
    );
    expect(revoke).toBeGreaterThanOrEqual(0);
    expect(revoke).toBeLessThan(migration.search(/grant /i));
  });

  it("grants select on scores and insert only on the submitted columns", () => {
    expect(grants).toContain("grant select on public.scores to anon, authenticated;");
    expect(grants).toContain("grant insert (game, name, score) on public.scores to anon, authenticated;");
  });

  it("grants select on games and game_stats", () => {
    expect(grants).toContain("grant select on public.games to anon, authenticated;");
    expect(grants).toContain("grant select on public.game_stats to anon, authenticated;");
  });

  it("never grants update, delete, truncate or all", () => {
    for (const grant of grants) expect(grant).not.toMatch(/\b(update|delete|truncate|all)\b/i);
  });

  it("defines exactly the expected policies, each open to anon and authenticated", () => {
    const policies = migration.match(/create policy [^;]+;/gi) ?? [];
    expect(policies).toEqual([
      'create policy "games are readable by everyone" on public.games for select to anon, authenticated using (true);',
      'create policy "scores are readable by everyone" on public.scores for select to anon, authenticated using (true);',
      'create policy "anyone can submit a score" on public.scores for insert to anon, authenticated with check (true);',
    ]);
  });

  it("constrains name length, upper-case name and score range", () => {
    expect(migration).toContain("char_length(name) between 1 and 10");
    expect(migration).toContain("name = upper(name)");
    expect(migration).toContain("score between 0 and 10000000");
  });

  it("references games from scores and makes game_stats security invoker", () => {
    expect(migration).toContain("game text not null references public.games (id)");
    expect(migration).toContain("create view public.game_stats with (security_invoker = true)");
  });
});
