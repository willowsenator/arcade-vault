import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import LibraryScreen from "./LibraryScreen";
import { GAMES } from "@/lib/data";

const cardOf = (title: string) => within(screen.getByText(title).closest("a")!);

describe("LibraryScreen", () => {
  it("filters games by title as the user types", () => {
    render(<LibraryScreen stats={{}} />);
    fireEvent.change(
      screen.getByPlaceholderText("Buscar un juego por nombre…"),
      { target: { value: "caída" } },
    );
    expect(screen.getByText("CAÍDA")).toBeInTheDocument();
    expect(screen.queryByText("SERPENTINA")).not.toBeInTheDocument();
  });
  it("filters by category chip", () => {
    render(<LibraryScreen stats={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "PUZZLE" }));
    expect(screen.getByText("CAÍDA")).toBeInTheDocument();
    expect(screen.queryByText("SERPENTINA")).not.toBeInTheDocument();
  });
  it("shows a no-results state when nothing matches", () => {
    render(<LibraryScreen stats={{}} />);
    fireEvent.change(
      screen.getByPlaceholderText("Buscar un juego por nombre…"),
      { target: { value: "zzz" } },
    );
    expect(screen.getByText("NO HAY RESULTADOS")).toBeInTheDocument();
  });
  it("shows the real best score on each card and a dash for unplayed games", () => {
    render(<LibraryScreen stats={{ [GAMES[0].id]: { best: 777, plays: 3 } }} />);
    expect(cardOf(GAMES[0].title).getByText("777")).toBeInTheDocument();
    for (const game of GAMES.slice(1)) {
      expect(cardOf(game.title).getByText("—")).toBeInTheDocument();
    }
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("shows a dash for a game that has plays but no best score", () => {
    render(<LibraryScreen stats={{ [GAMES[0].id]: { best: 0, plays: 2 } }} />);
    expect(cardOf(GAMES[0].title).getByText("—")).toBeInTheDocument();
  });
  it("keeps each card's own score when the list is filtered", () => {
    render(
      <LibraryScreen
        stats={{ [GAMES[0].id]: { best: 777, plays: 3 }, [GAMES[1].id]: { best: 555, plays: 1 } }}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Buscar un juego por nombre…"), {
      target: { value: GAMES[1].title },
    });
    expect(cardOf(GAMES[1].title).getByText("555")).toBeInTheDocument();
    expect(screen.queryByText("777")).toBeNull();
  });
});
