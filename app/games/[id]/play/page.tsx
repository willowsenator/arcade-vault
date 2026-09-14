import { notFound } from "next/navigation";
import PlayerScreen from "@/components/screens/PlayerScreen";
import { GAMES } from "@/lib/data";
export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = GAMES.find((candidate) => candidate.id === id);
  if (!game) notFound();
  return <PlayerScreen game={game} />;
}
