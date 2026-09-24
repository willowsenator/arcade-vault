import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import GameCard from "./GameCard";
import { GAMES } from "@/lib/data";

describe("GameCard", () => {
  const game = GAMES[0];

  it("links to the game detail route and shows its title", () => {
    render(<GameCard game={game} best={12345} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", `/games/${game.id}`);
    expect(screen.getByText(game.title)).toBeInTheDocument();
  });

  it("shows the best score formatted for Spanish", () => {
    render(<GameCard game={game} best={12345} />);
    expect(screen.getByText("12.345")).toBeInTheDocument();
  });

  it("does not group four-digit scores, as es-ES only groups from five digits", () => {
    render(<GameCard game={game} best={1234} />);
    expect(screen.getByText("1234")).toBeInTheDocument();
  });

  it.each([0, null])("shows a dash when the best score is %s", (best) => {
    render(<GameCard game={game} best={best} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
