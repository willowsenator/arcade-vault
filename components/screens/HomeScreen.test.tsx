import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HomeScreen from "./HomeScreen";
import { GAMES } from "@/lib/data";

const preview = GAMES.slice(0, 7);
const data = {
  stats: {
    [GAMES[0].id]: { best: 28450, plays: 1200 },
    [GAMES[1].id]: { best: 184220, plays: 800 },
  },
  recent: Object.fromEntries(
    preview.map((game, index) => [
      game.id,
      index === 2 ? [] : [{ rank: 1, name: `JUG${index}`, score: 12345 + index, date: "01/01/2026" }],
    ]),
  ),
  topPlayers: [
    { name: "ANA", score: 99999, game: GAMES[0].id },
    { name: "BEA", score: 88888, game: GAMES[1].id },
    { name: "CAL", score: 77777, game: GAMES[0].id },
    { name: "DAN", score: 66666, game: GAMES[1].id },
    { name: "EVA", score: 55555, game: GAMES[0].id },
  ],
};

describe("HomeScreen", () => {
  it("links the hero CTAs to the library and the sign-up flow", () => {
    render(<HomeScreen {...data} />);
    expect(screen.getByText("▶ EXPLORAR JUEGOS")).toHaveAttribute("href", "/biblioteca");
    expect(screen.getByText("✦ CREAR CUENTA")).toHaveAttribute("href", "/auth");
  });

  it("previews at most six real games, each linking to its detail page", () => {
    render(<HomeScreen {...data} />);
    const first = GAMES.slice(0, 6);
    first.forEach((game) => {
      expect(screen.getByText(game.title)).toBeInTheDocument();
    });
    expect(screen.getByText(first[0].title).closest("a")).toHaveAttribute(
      "href",
      `/games/${first[0].id}`,
    );
    if (GAMES.length > 6) {
      expect(screen.queryByText(GAMES[6].title)).not.toBeInTheDocument();
    }
  });

  it("shows a games stat derived from the real game count, not a hardcoded number", () => {
    render(<HomeScreen {...data} />);
    expect(screen.getByText(`${GAMES.length}+`)).toBeInTheDocument();
  });

  it("lists a recent-score row per previewed game that has scores, and none for an empty game", () => {
    render(<HomeScreen {...data} />);
    preview.forEach((game, index) => {
      const row = screen.queryByText(`▸ ${game.title}`);
      if (index === 2) {
        expect(row).not.toBeInTheDocument();
        return;
      }
      expect(row).toBeInTheDocument();
      expect(screen.getByText(`JUG${index}`)).toBeInTheDocument();
      expect(screen.getByText(`+${(12345 + index).toLocaleString("es-ES")}`)).toBeInTheDocument();
    });
  });

  it("renders the top players with padded ranks, names and scores", () => {
    render(<HomeScreen {...data} />);
    ["#01", "#02", "#03", "#04", "#05"].forEach((rank) => {
      expect(screen.getByText(rank)).toBeInTheDocument();
    });
    data.topPlayers.forEach((row) => {
      expect(screen.getByText(row.name)).toBeInTheDocument();
      expect(screen.getByText(row.score.toLocaleString("es-ES"))).toBeInTheDocument();
    });
  });

  it("links the top-players preview to the salón de la fama", () => {
    render(<HomeScreen {...data} />);
    expect(screen.getByText("VER SALÓN →")).toHaveAttribute("href", "/leaderboard");
  });

  it("shows a PARTIDAS stat summed from the real play counts", () => {
    render(<HomeScreen {...data} />);
    expect(screen.getByText("2.0K+")).toBeInTheDocument();
    expect(screen.getByText("PARTIDAS")).toBeInTheDocument();
  });

  it("switches the PARTIDAS stat to thousands exactly at 1000 plays", () => {
    const withPlays = (plays: number) => ({ ...data, stats: { [GAMES[0].id]: { best: 1, plays } } });
    const { unmount } = render(<HomeScreen {...withPlays(999)} />);
    expect(screen.getByText("999+")).toBeInTheDocument();
    unmount();
    render(<HomeScreen {...withPlays(1000)} />);
    expect(screen.getByText("1.0K+")).toBeInTheDocument();
  });

  it("shows empty texts when there are no scores yet", () => {
    render(<HomeScreen stats={{}} recent={{}} topPlayers={[]} />);
    expect(screen.getAllByText("AÚN NO HAY PUNTUACIONES")).toHaveLength(2);
    expect(screen.getByText("0+")).toBeInTheDocument();
  });

  it("links the final call to action back to the library", () => {
    render(<HomeScreen {...data} />);
    expect(screen.getByText("INSERTAR MONEDA →")).toHaveAttribute("href", "/biblioteca");
  });
});
