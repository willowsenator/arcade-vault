import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import GameDetailScreen from "./GameDetailScreen";
import { GAMES, type ScoreRow } from "@/lib/data";

const game = GAMES[0];
const stat = (label: string) => within(screen.getByText(label).parentElement!);
const rows = (container: HTMLElement) => container.querySelectorAll(".lb-row");

describe("GameDetailScreen", () => {
  it("renders the game's title, description, and a play link", () => {
    render(<GameDetailScreen game={game} stats={{ best: 0, plays: 0 }} topScores={[]} />);
    expect(screen.getByText(game.title)).toBeInTheDocument();
    expect(screen.getByText(game.long)).toBeInTheDocument();
    expect(screen.getByText("▶ JUGAR AHORA")).toHaveAttribute("href", `/games/${game.id}/play`);
    expect(screen.getByText("VOLVER AL VAULT")).toHaveAttribute("href", "/biblioteca");
  });

  it("shows the real play count and best score formatted for Spanish", () => {
    render(<GameDetailScreen game={game} stats={{ best: 90000, plays: 12345 }} topScores={[]} />);
    expect(stat("Partidas").getByText("12.345")).toBeInTheDocument();
    expect(stat("Mejor global").getByText("90.000")).toBeInTheDocument();
  });

  it("shows zero plays and a dash for the best score when nobody has played", () => {
    render(<GameDetailScreen game={game} stats={{ best: 0, plays: 0 }} topScores={[]} />);
    expect(stat("Partidas").getByText("0")).toBeInTheDocument();
    expect(stat("Mejor global").getByText("—")).toBeInTheDocument();
  });

  it("shows dashes and one error when the scores could not be loaded", () => {
    const { container } = render(<GameDetailScreen game={game} stats={null} topScores={null} />);
    expect(stat("Partidas").getByText("—")).toBeInTheDocument();
    expect(stat("Mejor global").getByText("—")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("NO SE PUDIERON CARGAR LAS PUNTUACIONES");
    expect(rows(container)).toHaveLength(0);
  });

  it("shows an empty state when there are no scores yet", () => {
    const { container } = render(
      <GameDetailScreen game={game} stats={{ best: 0, plays: 0 }} topScores={[]} />,
    );
    expect(screen.getByText("AÚN NO HAY PUNTUACIONES")).toBeInTheDocument();
    expect(rows(container)).toHaveLength(0);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not group four-digit values, matching es-ES", () => {
    render(<GameDetailScreen game={game} stats={{ best: 1234, plays: 4321 }} topScores={[]} />);
    expect(stat("Partidas").getByText("4321")).toBeInTheDocument();
    expect(stat("Mejor global").getByText("1234")).toBeInTheDocument();
  });

  it("lists the top scores in order with rank, name, date and score in their own cells", () => {
    const topScores: ScoreRow[] = [
      { rank: 1, name: "ANA", score: 50000, date: "09/05/2026" },
      { rank: 2, name: "LUIS", score: 0, date: "10/05/2026" },
    ];
    const { container } = render(
      <GameDetailScreen game={game} stats={{ best: 50000, plays: 2 }} topScores={topScores} />,
    );
    const listed = [...rows(container)];
    expect(listed).toHaveLength(2);
    const cells = (row: Element) => ({
      rk: row.querySelector(".rk")?.textContent,
      pl: row.querySelector(".pl")?.textContent,
      sc: row.querySelector(".sc")?.textContent,
    });
    expect(cells(listed[0])).toEqual({ rk: "#01", pl: "ANA09/05/2026", sc: "50.000" });
    expect(cells(listed[1])).toEqual({ rk: "#02", pl: "LUIS10/05/2026", sc: "0" });
  });

  it("shows stats with an error in the list when only the scores failed", () => {
    render(<GameDetailScreen game={game} stats={{ best: 90000, plays: 12345 }} topScores={null} />);
    expect(stat("Partidas").getByText("12.345")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("NO SE PUDIERON CARGAR LAS PUNTUACIONES");
  });

  it("shows the list with dashes for stats when only the stats are missing", () => {
    const topScores: ScoreRow[] = [{ rank: 1, name: "ANA", score: 10, date: "09/05/2026" }];
    const { container } = render(<GameDetailScreen game={game} stats={null} topScores={topScores} />);
    expect(stat("Partidas").getByText("—")).toBeInTheDocument();
    expect(stat("Mejor global").getByText("—")).toBeInTheDocument();
    expect(rows(container)).toHaveLength(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps two rows for the same name apart", () => {
    const topScores: ScoreRow[] = [
      { rank: 1, name: "ANA", score: 900, date: "09/05/2026" },
      { rank: 2, name: "ANA", score: 800, date: "08/05/2026" },
    ];
    const { container } = render(
      <GameDetailScreen game={game} stats={{ best: 900, plays: 2 }} topScores={topScores} />,
    );
    expect(rows(container)).toHaveLength(2);
  });
});
