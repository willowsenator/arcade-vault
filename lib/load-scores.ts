import { cookies } from "next/headers";
import type { ScoresClient } from "@/lib/score-queries";
import { createClient } from "@/utils/supabase/server";
import { withTimeout } from "@/lib/with-timeout";

export const LOAD_TIMEOUT_MS = 8_000;

export async function withScores<T>(
  load: (client: ScoresClient) => Promise<T>,
): Promise<T | null> {
  // Outside the try: cookies() throws Next's own rendering signals, which must reach the framework.
  const cookieStore = await cookies();
  try {
    return await withTimeout(load(createClient(cookieStore)), LOAD_TIMEOUT_MS);
  } catch (error) {
    console.error("Scores unavailable:", error);
    return null;
  }
}
