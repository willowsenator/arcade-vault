import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HomeScreen from "./HomeScreen";
import { GAMES } from "@/lib/data";

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

  it("links the final call to action back to the library", () => {
    render(<HomeScreen />);
    expect(screen.getByText("INSERTAR MONEDA →")).toHaveAttribute(
      "href",
      "/biblioteca",
    );
  });
});
