import { notFound } from "next/navigation";
import GameDetailScreen from "@/components/screens/GameDetailScreen";
import { GAMES } from "@/lib/data";
import { withScores } from "@/lib/load-scores";
import { DETAIL_SIZE, fetchGameStats, fetchTopScores } from "@/lib/score-queries";

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = GAMES.find((candidate) => candidate.id === id);
  if (!game) notFound();
  const data = await withScores(async (client) => {
    const [stats, topScores] = await Promise.all([
      fetchGameStats(client),
      fetchTopScores(client, game.id, DETAIL_SIZE),
    ]);
    return { stats: stats[game.id] ?? null, topScores };
  });
  return <GameDetailScreen game={game} stats={data?.stats ?? null} topScores={data?.topScores ?? null} />;
}
