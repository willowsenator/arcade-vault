import LeaderboardScreen from "@/components/screens/LeaderboardScreen";
import { GAMES } from "@/lib/data";
import { withScores } from "@/lib/load-scores";
import { LEADERBOARD_SIZE, fetchTopScoresByGame } from "@/lib/score-queries";

export const revalidate = 60;

export default async function LeaderboardPage() {
  const topByGame = await withScores((client) =>
    fetchTopScoresByGame(client, GAMES.map((game) => game.id), LEADERBOARD_SIZE),
  );
  return <LeaderboardScreen topByGame={topByGame} />;
}
