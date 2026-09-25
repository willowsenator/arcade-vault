This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Copy `.env.example` to `.env.local` and set `RESEND_API_KEY` to send email from the contact form at `/about`. Without it, the form still submits but shows a generic send-failure message.

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (from the project's Supabase dashboard → Connect → Framework) to use the Supabase client helpers under `utils/supabase/`. `/`, `/biblioteca`, `/games/[id]` and `/leaderboard` load real scores from Supabase, so `npm run build` needs these variables and a reachable Supabase, and fails without them. These pages are statically regenerated at most every 60 seconds, so a new score can take up to a minute to show in public lists. If a regeneration fails, the last good page keeps being served and the next request retries; if the first render of a score page fails, it lands on a generic segment-wide error page (neutral Spanish message, REINTENTAR retry). The session-refresh proxy (`proxy.ts`) fails open — it logs an error and lets the request through — if these are unset, but that only covers the session refresh, not the score pages.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Supabase scores

The owner applies the scores migration; the app does not apply it. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the deployment environment, and keep all secrets out of the repository. The public score pages (`/`, `/biblioteca`, `/games/[id]`, `/leaderboard`) are regenerated at most every 60 seconds, so a saved score can take up to a minute to appear in public lists (the player's own best is fetched client-side and is fresh). The build fails if Supabase is unreachable or the variables are unset at build time, since these pages are prerendered. A failed background regeneration keeps serving the last good page.

To apply the migration with the Supabase CLI, run `supabase link --project-ref <ref>` and then `supabase db push`. Alternatively, paste `supabase/migrations/20260924120000_scores.sql` into the Supabase SQL editor and run it.

After applying it, the owner runs this verification SQL against the project:

```sql
set role anon;
insert into public.scores (game, name, score) values ('rocas', 'QA_CHECK', 100);        -- succeeds
insert into public.scores (game, name, score) values ('rocas', 'qa_check', 100);        -- fails: scores_name_uppercase
insert into public.scores (game, name, score) values ('rocas', 'QA_CHECK', 10000001);   -- fails: scores_score_range
insert into public.scores (game, name, score) values ('nope', 'QA_CHECK', 1);           -- fails: foreign key
insert into public.scores (game, name, score, created_at) values ('rocas', 'QA_CHECK', 1, now());  -- permission denied: created_at is server-set
update public.scores set score = 1 where name = 'QA_CHECK';                             -- permission denied
delete from public.scores where name = 'QA_CHECK';                                      -- permission denied
reset role;
delete from public.scores where name = 'QA_CHECK';                                      -- cleanup, as owner
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
