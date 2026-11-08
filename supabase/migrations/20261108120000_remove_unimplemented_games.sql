-- Removes the games dropped from the catalog, together with their saved
-- scores. Scores go first because scores.game references games.id.

delete from public.scores where game in ('gloton', 'invasores', 'ranaria', 'duelo-pixel');

delete from public.games where id in ('gloton', 'invasores', 'ranaria', 'duelo-pixel');
