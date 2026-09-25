import { useEffect, useState } from "react";
import { fetchOwnBest, type OwnBest } from "@/lib/score-queries";
import { createClient } from "@/utils/supabase/client";

export type OwnBestState =
  | { status: "idle" | "loading" }
  | { status: "error" }
  | { status: "ready"; best: OwnBest | null };

type Settled = { key: string; state: OwnBestState };

export function useOwnBest(game: string, name: string | null): OwnBestState {
  const key = name ? `${game}:${name}` : null;
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (!key || !name) return;
    let cancelled = false;
    // Wrapping in a promise turns a synchronous createClient() throw into a rejection.
    Promise.resolve()
      .then(() => fetchOwnBest(createClient(), game, name))
      .then((best) => {
        if (!cancelled) setSettled({ key, state: { status: "ready", best } });
      })
      .catch((error) => {
        console.error("useOwnBest failed", error);
        if (!cancelled) setSettled({ key, state: { status: "error" } });
      });
    return () => {
      cancelled = true;
    };
  }, [key, game, name]);

  if (!key) return { status: "idle" };
  return settled?.key === key ? settled.state : { status: "loading" };
}
