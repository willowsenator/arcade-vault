import type { ScoresClient } from "@/lib/score-queries";
import { createPublicClient } from "@/utils/supabase/public";
import { LOAD_TIMEOUT_MS, withTimeout } from "@/lib/with-timeout";

export async function withScores<T>(
  load: (client: ScoresClient) => Promise<T>,
): Promise<T> {
  try {
    return await withTimeout(load(createPublicClient()), LOAD_TIMEOUT_MS);
  } catch (error) {
    console.error("Scores unavailable:", error);
    throw error;
  }
}
