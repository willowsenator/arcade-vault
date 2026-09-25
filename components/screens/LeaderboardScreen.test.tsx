import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import LeaderboardScreen from "./LeaderboardScreen";
import { AuthProvider } from "@/components/AuthProvider";
import { GAMES, type ScoreRow } from "@/lib/data";

const mocks = vi.hoisted(() => ({ fetchOwnBest: vi.fn(), createClient: vi.fn() }));

vi.mock("@/lib/score-queries", () => ({ fetchOwnBest: mocks.fetchOwnBest }));
vi.mock("@/utils/supabase/client", () => ({ createClient: mocks.createClient }));

const rocas = GAMES.find((game) => game.id === "rocas")!;
const rocasRows: ScoreRow[] = [
  { rank: 1, name: "ANA", score: 123456, date: "09/05/2026" },
  { rank: 2, name: "LUIS", score: 65432, date: "10/05/2026" },
  { rank: 3, name: "MARTA", score: 54321, date: "11/05/2026" },
  { rank: 4, name: "PEPE", score: 0, date: "12/05/2026" },
];
const topByGame = { rocas: rocasRows, [GAMES[1].id]: [] };

function renderScreen(props: { topByGame: Record<string, ScoreRow[]> } = { topByGame }) {
  return render(
    <AuthProvider>
      <LeaderboardScreen {...props} />
    </AuthProvider>,
  );
}
const openRocas = () => fireEvent.click(screen.getByText(rocas.title));
const tableRows = (container: HTMLElement) =>
  container.querySelectorAll(".hall-table .tr:not(.you):not(.you-label)");
const podium = (container: HTMLElement, slot: string) =>
  within(container.querySelector(`.podium-slot.${slot}`) as HTMLElement);
const signIn = () => localStorage.setItem("av_user", JSON.stringify({ name: "PX_KAI" }));

describe("LeaderboardScreen", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.fetchOwnBest.mockReset();
    mocks.createClient.mockReset();
    mocks.createClient.mockReturnValue({});
  });

  it("switches tabs between games", () => {
    renderScreen();
    expect(screen.getByText(GAMES[0].title)).toHaveClass("active");
    fireEvent.click(screen.getByText(GAMES[1].title));
    expect(screen.getByText(GAMES[1].title)).toHaveClass("active");
  });

  it("lists the rows for the selected game with rank, name, score and date", () => {
    const { container } = renderScreen();
    openRocas();
    const rows = tableRows(container);
    expect(rows).toHaveLength(rocasRows.length);
    const first = within(rows[0] as HTMLElement);
    expect(first.getByText("#01")).toBeInTheDocument();
    expect(first.getByText("ANA")).toBeInTheDocument();
    expect(first.getByText("123.456")).toBeInTheDocument();
    expect(first.getByText("09/05/2026")).toBeInTheDocument();
    expect(within(rows[rocasRows.length - 1] as HTMLElement).getByText("0")).toBeInTheDocument();
  });

  it("puts the first three rows on the podium", () => {
    const { container } = renderScreen();
    openRocas();
    expect(podium(container, "silver").getByText("LUIS")).toBeInTheDocument();
    expect(podium(container, "gold").getByText("ANA")).toBeInTheDocument();
    expect(podium(container, "gold").getByText("CAMPEÓN")).toBeInTheDocument();
    expect(podium(container, "bronze").getByText("MARTA")).toBeInTheDocument();
  });

  it("shows only the gold slot when there is a single row", () => {
    const { container } = renderScreen({ topByGame: { rocas: rocasRows.slice(0, 1) } });
    openRocas();
    expect(podium(container, "gold").getByText("ANA")).toBeInTheDocument();
    expect(container.querySelector(".podium-slot.silver")).toBeNull();
    expect(container.querySelector(".podium-slot.bronze")).toBeNull();
    expect(tableRows(container)).toHaveLength(1);
  });

  it("shows gold and silver but no bronze slot with two rows", () => {
    const { container } = renderScreen({ topByGame: { rocas: rocasRows.slice(0, 2) } });
    openRocas();
    expect(podium(container, "gold").getByText("ANA")).toBeInTheDocument();
    expect(podium(container, "silver").getByText("LUIS")).toBeInTheDocument();
    expect(container.querySelector(".podium-slot.bronze")).toBeNull();
  });

  it("shows an empty state without rows or podium names for a game with no scores", () => {
    const { container } = renderScreen();
    fireEvent.click(screen.getByText(GAMES[1].title));
    expect(screen.getByText("AÚN NO HAY PUNTUACIONES")).toBeInTheDocument();
    expect(tableRows(container)).toHaveLength(0);
    expect(container.querySelectorAll(".podium .name")).toHaveLength(0);
  });

  it("links back to the library", () => {
    renderScreen();
    expect(screen.getByText("VOLVER A LA BIBLIOTECA")).toHaveAttribute("href", "/biblioteca");
  });

  it("does not show the own-best block for a guest", () => {
    renderScreen();
    expect(screen.queryByText(/TU MEJOR MARCA/)).not.toBeInTheDocument();
    expect(mocks.fetchOwnBest).not.toHaveBeenCalled();
  });

  it("shows the signed-in user's real best after loading it", async () => {
    signIn();
    mocks.fetchOwnBest.mockResolvedValue({ score: 12345, date: "13/05/2026", rank: 37 });
    const { container } = renderScreen();
    openRocas();
    expect(screen.getByText("CARGANDO TU MARCA…")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("#37")).toBeInTheDocument());
    const own = within(container.querySelector(".tr.you") as HTMLElement);
    expect(own.getByText("PX_KAI")).toBeInTheDocument();
    expect(own.getByText("12.345")).toBeInTheDocument();
    expect(own.getByText("13/05/2026")).toBeInTheDocument();
    expect(mocks.fetchOwnBest).toHaveBeenCalledWith({}, "rocas", "PX_KAI");
  });

  it("shows a message when the user has no score in the game", async () => {
    signIn();
    mocks.fetchOwnBest.mockResolvedValue(null);
    renderScreen();
    openRocas();
    expect(await screen.findByText("TODAVÍA NO TIENES PUNTUACIÓN EN ROCAS")).toBeInTheDocument();
  });

  it("shows an error when the own best could not be loaded", async () => {
    signIn();
    mocks.fetchOwnBest.mockRejectedValue(new Error("boom"));
    renderScreen();
    expect(await screen.findByText("NO SE PUDO CARGAR TU MARCA")).toBeInTheDocument();
  });

  it("displays a saved zero as 0", async () => {
    signIn();
    mocks.fetchOwnBest.mockResolvedValue({ score: 0, date: "13/05/2026", rank: 4 });
    const { container } = renderScreen();
    openRocas();
    await waitFor(() => expect(container.querySelector(".tr.you .rk")).toHaveTextContent("#04"));
    expect(container.querySelector(".tr.you .sc")).toHaveTextContent(/^0$/);
  });

  it("shows the own-best block without a table header when the list is empty", async () => {
    signIn();
    mocks.fetchOwnBest.mockResolvedValue(null);
    const { container } = renderScreen({ topByGame: { rocas: [], [GAMES[1].id]: [] } });
    openRocas();
    expect(screen.getByText(/TU MEJOR MARCA EN/)).toBeInTheDocument();
    expect(container.querySelector(".th")).toBeNull();
    expect(await screen.findByText("TODAVÍA NO TIENES PUNTUACIÓN EN ROCAS")).toBeInTheDocument();
  });

  it("fetches the own best of the newly selected game when switching tabs", async () => {
    signIn();
    mocks.fetchOwnBest.mockResolvedValue(null);
    renderScreen();
    openRocas();
    await waitFor(() => expect(mocks.fetchOwnBest).toHaveBeenCalledWith({}, "rocas", "PX_KAI"));
    fireEvent.click(screen.getByText(GAMES[1].title));
    await waitFor(() =>
      expect(mocks.fetchOwnBest).toHaveBeenCalledWith({}, GAMES[1].id, "PX_KAI"),
    );
  });
});
