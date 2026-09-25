import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GAMES } from "@/lib/data";
import { fakeClient } from "@/lib/score-queries.testing";

const createPublicClientMock = vi.hoisted(() => vi.fn());
vi.mock("@/utils/supabase/public", () => ({ createPublicClient: createPublicClientMock }));

import * as home from "@/app/page";
import * as library from "@/app/biblioteca/page";
import * as detail from "@/app/games/[id]/page";
import * as leaderboard from "@/app/leaderboard/page";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const SCORE_PAGES = {
  "app/page.tsx": home,
  "app/biblioteca/page.tsx": library,
  "app/games/[id]/page.tsx": detail,
  "app/leaderboard/page.tsx": leaderboard,
};

const REQUEST_BOUND_APIS = /next\/headers|cookies\(|headers\(/;

describe("time-based regenerated score pages", () => {
  it.each(Object.entries(SCORE_PAGES))("%s revalidates every 60 seconds and is not forced dynamic", (_path, page) => {
    expect(page.revalidate).toBe(60);
    expect((page as { dynamic?: unknown }).dynamic).toBeUndefined();
  });

  it.each([...Object.keys(SCORE_PAGES), "lib/load-scores.ts", "utils/supabase/public.ts"])(
    "%s does not use request-bound APIs",
    (path) => {
      expect(read(path)).not.toMatch(REQUEST_BOUND_APIS);
    },
  );
});

describe("score pages read through the public client", () => {
  beforeEach(() => {
    createPublicClientMock.mockReset();
    createPublicClientMock.mockReturnValue(fakeClient(() => ({ data: [] })).client);
  });

  it.each([
    ["app/page.tsx", () => home.default()],
    ["app/biblioteca/page.tsx", () => library.default()],
    ["app/leaderboard/page.tsx", () => leaderboard.default()],
    ["app/games/[id]/page.tsx", () => detail.default({ params: Promise.resolve({ id: GAMES[0].id }) })],
  ])("%s creates the public client", async (_path, render) => {
    await render();
    expect(createPublicClientMock).toHaveBeenCalledOnce();
  });
});

describe("error boundary placement", () => {
  const errorFiles = (dir: string): string[] =>
    readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return errorFiles(path);
      return entry.name === "error.tsx" ? [path] : [];
    });

  it("has only the segment-wide app/error.tsx so no nested boundary shadows it", () => {
    expect(errorFiles("app")).toEqual(["app/error.tsx"]);
  });
});
