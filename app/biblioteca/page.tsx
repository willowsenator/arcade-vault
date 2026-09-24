import LibraryScreen from "@/components/screens/LibraryScreen";
import { withScores } from "@/lib/load-scores";
import { fetchGameStats } from "@/lib/score-queries";

export default async function BibliotecaPage() {
  const stats = await withScores(fetchGameStats);
  return <LibraryScreen stats={stats} />;
}
