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
- The App Router exposes `/` (marketing landing), `/biblioteca` (game library), `/about`, `/games/[id]`, `/games/[id]/play`, `/auth`, and `/leaderboard`. Shared UI lives in `components/`, game and score data helpers live in `lib/`, and component/unit tests use Vitest with React Testing Library.
