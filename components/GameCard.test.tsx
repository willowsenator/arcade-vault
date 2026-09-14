import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import GameCard from "./GameCard";
import { GAMES } from "@/lib/data";

describe("GameCard", () => {
  it("links to the game detail route and shows its title and score", () => {
    const game = GAMES[0];
    render(<GameCard game={game} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", `/games/${game.id}`);
    expect(screen.getByText(game.title)).toBeInTheDocument();
    expect(screen.getByText(game.best.toLocaleString("es-ES"))).toBeInTheDocument();
  });
});
