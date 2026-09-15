import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import LeaderboardScreen from "./LeaderboardScreen";
import { AuthProvider } from "@/components/AuthProvider";
import { GAMES } from "@/lib/data";
describe("LeaderboardScreen", () => {
  beforeEach(() => localStorage.clear());

  it("shows rows for the first game by default and switches on tab click", () => {
    render(<AuthProvider><LeaderboardScreen /></AuthProvider>);
    const count = screen.getAllByText(/^#\d{2}$/).length;
    fireEvent.click(screen.getByText(GAMES[1].title));
    expect(screen.getAllByText(/^#\d{2}$/).length).toBe(count);
    expect(screen.getByText(GAMES[1].title)).toHaveClass("active");
  });

  it("does not show a highlighted row for a guest", () => {
    render(<AuthProvider><LeaderboardScreen /></AuthProvider>);
    expect(screen.queryByText(/TU MEJOR MARCA/)).not.toBeInTheDocument();
  });

  it("links back to the library", () => {
    render(<AuthProvider><LeaderboardScreen /></AuthProvider>);
    expect(screen.getByText("VOLVER A LA BIBLIOTECA")).toHaveAttribute(
      "href",
      "/biblioteca",
    );
  });

  it("highlights the signed-in user's own row", () => {
    localStorage.setItem("av_user", JSON.stringify({ name: "PX_KAI" }));
    const { container } = render(<AuthProvider><LeaderboardScreen /></AuthProvider>);
    const ownRow = container.querySelector(".tr.you");
    expect(ownRow).not.toBeNull();
    expect(within(ownRow as HTMLElement).getByText("PX_KAI")).toBeInTheDocument();
  });
});
