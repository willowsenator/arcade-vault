-- IRREVERSIBLE: removes the games dropped from the catalog together with
-- their saved scores, which cannot be restored afterwards. Export the rows
-- first if they matter, and apply this only after the code that stops
-- offering these games is deployed. Scores go first because scores.game
-- references games.id.

delete from public.scores where game in ('gloton', 'invasores', 'ranaria', 'duelo-pixel');

delete from public.games where id in ('gloton', 'invasores', 'ranaria', 'duelo-pixel');
