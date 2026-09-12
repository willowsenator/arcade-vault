# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm start` — run the production build
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next` core-web-vitals + typescript rules)

No test runner is configured yet.

## Architecture

- Next.js 16 App Router project (`app/` directory), React 19, TypeScript (strict), Tailwind CSS v4 (via `@tailwindcss/postcss`, configured in `postcss.config.mjs`; no separate `tailwind.config` file — v4 is CSS-first, see `app/globals.css`).
- `app/layout.tsx` defines the root layout and loads the Geist Sans/Mono fonts via `next/font/google`, exposed as CSS variables (`--font-geist-sans`, `--font-geist-mono`).
- Path alias `@/*` maps to the repo root (`tsconfig.json`).
- Currently just the scaffolded homepage (`app/page.tsx`) — no additional routes, components, or data layer exist yet.
