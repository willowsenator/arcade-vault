import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import LibraryScreen from "./LibraryScreen";

describe("LibraryScreen", () => {
  it("filters games by title as the user types", () => { render(<LibraryScreen />); fireEvent.change(screen.getByPlaceholderText("Buscar un juego por nombre…"), { target: { value: "caída" } }); expect(screen.getByText("CAÍDA")).toBeInTheDocument(); expect(screen.queryByText("SERPENTINA")).not.toBeInTheDocument(); });
  it("filters by category chip", () => { render(<LibraryScreen />); fireEvent.click(screen.getByRole("button", { name: "PUZZLE" })); expect(screen.getByText("CAÍDA")).toBeInTheDocument(); expect(screen.queryByText("SERPENTINA")).not.toBeInTheDocument(); });
  it("shows a no-results state when nothing matches", () => { render(<LibraryScreen />); fireEvent.change(screen.getByPlaceholderText("Buscar un juego por nombre…"), { target: { value: "zzz" } }); expect(screen.getByText("NO HAY RESULTADOS")).toBeInTheDocument(); });
});
