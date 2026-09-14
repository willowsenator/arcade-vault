import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import GameDetailScreen from "./GameDetailScreen";
import { GAMES } from "@/lib/data";

describe("GameDetailScreen", () => {
  it("renders the game's title, description, and a play link", () => { const game = GAMES[0]; render(<GameDetailScreen game={game} />); expect(screen.getByText(game.title)).toBeInTheDocument(); expect(screen.getByText(game.long)).toBeInTheDocument(); expect(screen.getByText("▶ JUGAR AHORA")).toHaveAttribute("href", `/games/${game.id}/play`); });
  it("renders a leaderboard with 10 rows", () => { render(<GameDetailScreen game={GAMES[0]} />); expect(screen.getByText("MEJORES PUNTUACIONES")).toBeInTheDocument(); expect(screen.getAllByText(/^#\d{2}$/)).toHaveLength(10); });
});
