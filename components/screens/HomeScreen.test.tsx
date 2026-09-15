import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HomeScreen from "./HomeScreen";
import { GAMES, seededScores } from "@/lib/data";

function parsePlays(value: string): number {
  const trimmed = value.trim();
  if (trimmed.endsWith("K")) return Math.round(parseFloat(trimmed) * 1000);
  return Number.parseInt(trimmed, 10) || 0;
}

function formatTotalPlays(total: number): string {
  return total >= 1000 ? `${(total / 1000).toFixed(1)}K+` : `${total}+`;
}

describe("HomeScreen", () => {
  it("links the hero CTAs to the library and the sign-up flow", () => {
    render(<HomeScreen />);
    expect(screen.getByText("▶ EXPLORAR JUEGOS")).toHaveAttribute(
      "href",
      "/biblioteca",
    );
    expect(screen.getByText("✦ CREAR CUENTA")).toHaveAttribute(
      "href",
      "/auth",
    );
  });

  it("previews at most six real games, each linking to its detail page", () => {
    render(<HomeScreen />);
    const preview = GAMES.slice(0, 6);
    preview.forEach((game) => {
      expect(screen.getByText(game.title)).toBeInTheDocument();
    });
    expect(screen.getByText(preview[0].title).closest("a")).toHaveAttribute(
      "href",
      `/games/${preview[0].id}`,
    );
    if (GAMES.length > 6) {
      expect(screen.queryByText(GAMES[6].title)).not.toBeInTheDocument();
    }
  });

  it("shows a games-played stat derived from the real game count, not a hardcoded number", () => {
    render(<HomeScreen />);
    expect(screen.getByText(`${GAMES.length}+`)).toBeInTheDocument();
  });

  it("lists one recent-score row per previewed game, sourced from seededScores", () => {
    render(<HomeScreen />);
    GAMES.slice(0, 7).forEach((game) => {
      expect(screen.getByText(`▸ ${game.title}`)).toBeInTheDocument();
    });
  });

  it("links the top-players preview to the salón de la fama", () => {
    render(<HomeScreen />);
    expect(screen.getByText("VER SALÓN →")).toHaveAttribute(
      "href",
      "/leaderboard",
    );
  });

  it("shows a PARTIDAS stat computed from the real per-game play counts", () => {
    render(<HomeScreen />);
    const totalPlays = GAMES.reduce(
      (sum, game) => sum + parsePlays(game.plays),
      0,
    );
    expect(
      screen.getByText(formatTotalPlays(totalPlays)),
    ).toBeInTheDocument();
    expect(screen.getByText("PARTIDAS")).toBeInTheDocument();
  });

  it("renders the top-players preview sourced from seededScores", () => {
    render(<HomeScreen />);
    const [topPlayer] = seededScores(7, 5);
    expect(screen.getByText(topPlayer.name)).toBeInTheDocument();
    expect(
      screen.getByText(topPlayer.score.toLocaleString("es-ES")),
    ).toBeInTheDocument();
  });

  it("links the final call to action back to the library", () => {
    render(<HomeScreen />);
    expect(screen.getByText("INSERTAR MONEDA →")).toHaveAttribute(
      "href",
      "/biblioteca",
    );
  });
});
