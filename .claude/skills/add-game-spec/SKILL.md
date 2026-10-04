---
name: add-game-spec
description: Write a requirements spec for adding a game to the arcade vault. Use when asked to add a game, make a catalog game playable, port a sibling game repo, or spec a new game.
user-invocable: true
argument-hint: <game-id> [reference-path]
---

# Spec a Game for the Arcade Vault

Produce one requirements spec for adding a single game to this vault, saved to
`~/.claude/specs/`. This skill only writes the spec: it does not edit vault code, write the
implementation plan, or commit.

## Input

- `$0` — Game id (a catalog id from `lib/data.ts`, or a new id for a game not yet listed)
- `$1` — (Optional) Path to a reference implementation to port

## Instructions

1. If no game id is provided, ask the user which game to spec, and stop until they answer.
   Never infer the game from the conversation or pick one from the catalog.
2. Resolve where the game's rules come from. Never detect a reference automatically and
   keep no per-game mapping in this skill:
   1. If `$1` is given, use it as the rules reference. Confirm the path exists; if not, say
      so and ask.
   2. Otherwise ask with `AskUserQuestion` for a reference path, or "none" for a game with
      no reference.

   The reference supplies only the game's rules. The code structure of every game is fixed
   by the existing asteroids port in this vault (`lib/asteroids/` and
   `components/games/AsteroidsCanvas.tsx`), so a game with a reference is re-expressed in
   that structure, not copied from the reference's layout.
3. If a reference was resolved, read it before drafting: its `README.md`, `SPEC.md` and
   `CLAUDE.md` where present, and its game logic entry points (for example `game.js`,
   `engine.js`, or the source under `js/`). Record in the spec:
   - the reference path;
   - rules, controls, scoring, lives and level progression, each as the reference
     actually implements them.

   A rule you cannot confirm in the reference files goes under the spec's Open Questions,
   never into an acceptance criterion. Do not fill gaps from what you know of the genre.
4. If there is no reference (the user answered "none"), the rules are design decisions and
   are the user's to make. Ask for them with one batched `AskUserQuestion` round covering:
   - rules (win/lose conditions and core mechanic);
   - controls;
   - scoring;
   - lives and level progression.

   Then restate the answers as a short mini-spec in the conversation and wait for the user to
   confirm it. Write no file until they do. A point the user cannot answer yet goes under the
   spec's Open Questions; never choose a default for it.
5. Check the catalog. If the game id is in `lib/data.ts`, the spec updates that entry. If it
   is not, ask for the catalog fields (`title`, `short`, `long`, `cat`, `color`) in the same
   batched round as step 4 where possible, and record the answers in the spec.
6. If `~/.claude/specs/*-<game-id>-*-spec.md` already exists, read it and update it in place
   instead of creating a duplicate. Otherwise write
   `~/.claude/specs/YYYY-MM-DD-add-<game-id>-spec.md` in the standard spec format:
   `# Spec: <Title>`, then Project, Status (`Draft`), Created and Updated, then the sections
   Problem, Goals, Non-Goals, User Stories / Scenarios, Acceptance Criteria, Out of Scope and
   Open Questions.
7. Put the game's rules, controls, scoring, lives and levels from steps 3 or 4 into the
   acceptance criteria, and include a criterion for each vault touchpoint, in every spec:
   - a DOM-free engine in `lib/<game>/` with the same module split as `lib/asteroids/`
     (entities, a game state machine, a renderer, a test helper), and no `window`,
     `document` or canvas use outside the renderer module;
   - a canvas component under `components/games/`, built like `AsteroidsCanvas` (animation
     frame loop, stats callback), with a test that mounts it, checks that the stats callback
     fires, and checks that the loop is cleaned up on unmount;
   - `PlayerScreen` choosing the canvas component and stats shape by engine id, with no
     hardcoded condition for this game, and the existing `rocas` tests still passing;
   - the new engine id added to the `Game.engine` union and set on the catalog entry;
   - a cover class in `app/globals.css` referenced by the catalog entry;
   - a new migration under `supabase/migrations/` adding the game id to the scores
     allow-list, plus a test that fails when the catalog ids and the allow-list diverge;
   - lint, tests and build passing;
   - the Architecture notes in the project `CLAUDE.md` naming the new game, with no counts.

   Seed one Open Question in every spec until the user decides it: whether the scores
   allow-list stays one migration per game or becomes a lookup table.
8. Before saving, check the draft against the anti-placeholder rules: every acceptance
   criterion is testable and specific, the Problem names the actual trigger rather than
   restating the title, and every Non-Goal and Out of Scope entry says why it is excluded.
9. Finish by summarizing the spec's Goals and Acceptance Criteria and giving its path. Tell
   the user the next step is the task-planning skill, with its `Spec:` field pointing at that
   file. Do not invoke it: a design decision may be needed first.

## Guardrails

- This skill writes only the spec file in `~/.claude/specs/`. Do not edit vault source,
  tests, styles, migrations or `CLAUDE.md`; the implementation plan does that.
- Do not commit or push.
- Do not write the implementation plan.
- Ask rather than guess whenever the game, the reference or a rule is unclear.
