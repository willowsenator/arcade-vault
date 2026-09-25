import { notFound } from "next/navigation";
import GameDetailScreen from "@/components/screens/GameDetailScreen";
import { GAMES } from "@/lib/data";
import { withScores } from "@/lib/load-scores";
import { DETAIL_SIZE, fetchGameStats, fetchTopScores } from "@/lib/score-queries";

export const revalidate = 60;

export function generateStaticParams() {
  return GAMES.map(({ id }) => ({ id }));
}

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
  return <GameDetailScreen game={game} stats={data.stats} topScores={data.topScores} />;
}
