import HomeScreen from "@/components/screens/HomeScreen";
import { GAMES } from "@/lib/data";
import { withScores } from "@/lib/load-scores";
import {
  TOP_PLAYERS_SIZE,
  fetchGameStats,
  fetchTopPlayers,
  fetchTopScoresByGame,
} from "@/lib/score-queries";

export default async function Home() {
  const data = await withScores(async (client) => {
    const [stats, recent, topPlayers] = await Promise.all([
      fetchGameStats(client),
      fetchTopScoresByGame(client, GAMES.slice(0, 7).map((game) => game.id), 1),
      fetchTopPlayers(client, TOP_PLAYERS_SIZE),
    ]);
    return { stats, recent, topPlayers };
  });
  return (
    <HomeScreen
      stats={data?.stats ?? null}
      recent={data?.recent ?? null}
      topPlayers={data?.topPlayers ?? null}
    />
  );
}
