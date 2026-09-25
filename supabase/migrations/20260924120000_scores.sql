-- Scores for the Arcade Vault. Anyone can read scores and submit one; nobody
-- can change or delete a saved score through the API.

create table public.games (
  id text primary key
);

insert into public.games (id) values
  ('bloque-buster'),
  ('caida'),
  ('serpentina'),
  ('gloton'),
  ('invasores'),
  ('rocas'),
  ('ranaria'),
  ('duelo-pixel');

create table public.scores (
  id bigint generated always as identity primary key,
  game text not null references public.games (id),
  name text not null,
  score integer not null,
  created_at timestamptz not null default now(),
  constraint scores_name_length check (char_length(name) between 1 and 10),
  constraint scores_name_uppercase check (name = upper(name)),
  constraint scores_score_range check (score between 0 and 10000000)
);

create index scores_game_ranking_idx on public.scores (game, score desc, created_at asc);

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games are readable by everyone"
  on public.games for select to anon, authenticated using (true);
create policy "scores are readable by everyone"
  on public.scores for select to anon, authenticated using (true);
create policy "anyone can submit a score"
  on public.scores for insert to anon, authenticated with check (true);

create view public.game_stats with (security_invoker = true) as
  select g.id as game, coalesce(max(s.score), 0) as best, count(s.id) as plays
  from public.games g
  left join public.scores s on s.game = g.id
  group by g.id;

-- Start from no privileges so the grants below are the whole API surface, and
-- let clients insert only the submitted columns (created_at stays server-set).
revoke all on public.games, public.scores, public.game_stats from anon, authenticated;

grant select on public.games to anon, authenticated;
grant select on public.scores to anon, authenticated;
grant insert (game, name, score) on public.scores to anon, authenticated;
grant select on public.game_stats to anon, authenticated;
