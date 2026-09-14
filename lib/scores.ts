export type ScoreEntry = { game: string; score: number; name: string };

const SCORES_KEY = "av_scores";

export function saveScore(entry: ScoreEntry): void {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable or corrupt — skip persistence
  }
}

export function getSavedScores(): (ScoreEntry & { at: number })[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
  } catch {
    return [];
  }
}
