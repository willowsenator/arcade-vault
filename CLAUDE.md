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
- Scores: `/leaderboard`, `/`, `/biblioteca` and `/games/[id]` load real scores on the server through `withScores`, which reads with the cookie-less public Supabase client (`utils/supabase/public.ts`) and, on failure, logs and rethrows (there is no "scores unavailable" state in the screens; empty lists still show the Spanish empty state). Each page exports `revalidate = 60`, so it is statically regenerated at most every 60 seconds (`/games/[id]` prerenders every catalog game via `generateStaticParams`); a failed regeneration keeps serving the last good page and retries on the next request, while a failed first render lands on `app/error.tsx`, a generic segment-wide error page (neutral Spanish `PAGE_ERROR` message from `lib/messages.ts`, REINTENTAR retry, error logged client-side). Because these pages are prerendered at build, `next build` fails if the Supabase variables are unset or Supabase is unreachable. A new score can take up to a minute to show in public lists; the signed-in player's own best is fetched client-side and is fresh. Saving a score from the player uses the browser client. The schema lives in `supabase/migrations/`.
- `/api/contact` requires the `RESEND_API_KEY` environment variable to send email (see `.env.example`).
- `utils/supabase/client.ts`, `utils/supabase/server.ts` and `utils/supabase/public.ts` are Supabase client factories for Client Components, Server Components/Route Handlers (cookie-bound; no page imports it now) and cookie-less public reads (used by `withScores`) respectively; `utils/supabase/middleware.ts` refreshes the auth session cookie and is invoked from the root `proxy.ts` (Next.js 16's `middleware.ts` file convention, renamed). All of them require `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`); `proxy.ts` fails open (logs and lets the request through) if they're unset, but only for the session refresh: the score pages and `next build` still need the variables (see the Scores bullet above).
