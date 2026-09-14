import { notFound } from "next/navigation";
import GameDetailScreen from "@/components/screens/GameDetailScreen";
import { GAMES } from "@/lib/data";

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = GAMES.find((candidate) => candidate.id === id);
  if (!game) notFound();
  return <GameDetailScreen game={game} />;
}
