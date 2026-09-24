import { cookies } from "next/headers";
import type { ScoresClient } from "@/lib/score-queries";
import { createClient } from "@/utils/supabase/server";

export async function withScores<T>(
  load: (client: ScoresClient) => Promise<T>,
): Promise<T | null> {
  try {
    return await load(createClient(await cookies()));
  } catch (error) {
    console.error("Scores unavailable:", error);
    return null;
  }
}
