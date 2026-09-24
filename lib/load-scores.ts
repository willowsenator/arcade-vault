import { cookies } from "next/headers";
import type { ScoresClient } from "@/lib/score-queries";
import { createClient } from "@/utils/supabase/server";

export async function withScores<T>(
  load: (client: ScoresClient) => Promise<T>,
): Promise<T | null> {
  // Outside the try: cookies() throws Next's own rendering signals, which must reach the framework.
  const cookieStore = await cookies();
  try {
    return await load(createClient(cookieStore));
  } catch (error) {
    console.error("Scores unavailable:", error);
    return null;
  }
}
