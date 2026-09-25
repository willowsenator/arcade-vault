# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm start` — run the production build
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next` core-web-vitals + typescript rules)
- `npm test` — run the Vitest component/unit suite in jsdom

## Architecture

- Next.js 16 App Router project (`app/` directory), React 19, TypeScript (strict), Tailwind CSS v4 (via `@tailwindcss/postcss`, configured in `postcss.config.mjs`; no separate `tailwind.config` file — v4 is CSS-first, see `app/globals.css`).
- `app/layout.tsx` defines the root layout, shared auth/nav shell, and loads Press Start 2P and JetBrains Mono via `next/font/google`, exposed as `--font-pixel` and `--font-mono`.
- Path alias `@/*` maps to the repo root (`tsconfig.json`).
- `lib/asteroids/` is a DOM-free port of the `02-asteroids` game (entities, the `AsteroidsGame` state machine, and a canvas renderer); `components/games/AsteroidsCanvas.tsx` runs it in a `requestAnimationFrame` loop. `PlayerScreen` renders it for any game whose `engine` is `"asteroids"` (currently `rocas`) and takes score/lives/level from it; games without an engine keep the mock player. The vault copy is independent of `02-asteroids` and may diverge.
- The App Router exposes `/` (marketing landing), `/biblioteca` (game library), `/about`, `/games/[id]`, `/games/[id]/play`, `/auth`, `/leaderboard`, and `/api/contact` (contact-form email endpoint). Shared UI lives in `components/`, game and score data helpers live in `lib/` (`lib/score-queries.ts` holds the score queries and `lib/load-scores.ts` the `withScores` loader), and component/unit tests use Vitest with React Testing Library.
- Scores: `/leaderboard`, `/`, `/biblioteca` and `/games/[id]` load real scores on the server through `withScores`, which uses the server Supabase client and returns `null` on failure so the page shows a Spanish error state. Saving a score from the player uses the browser client. The schema lives in `supabase/migrations/`.
- `/api/contact` requires the `RESEND_API_KEY` environment variable to send email (see `.env.example`).
- `utils/supabase/client.ts` and `utils/supabase/server.ts` are Supabase client factories for Client Components and Server Components/Route Handlers respectively; `utils/supabase/middleware.ts` refreshes the auth session cookie and is invoked from the root `proxy.ts` (Next.js 16's `middleware.ts` file convention, renamed). All four require `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`); `proxy.ts` fails open (logs and lets the request through) if they're unset, since pages load scores through `withScores` (see the Scores bullet above), which handles missing configuration itself.
