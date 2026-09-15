import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import PlayerScreen from "./PlayerScreen";
import { AuthProvider } from "@/components/AuthProvider";
import { GAMES } from "@/lib/data";
describe("PlayerScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());
  it("increases the score on an interval while not paused", () => {
    render(
      <AuthProvider>
        <PlayerScreen game={GAMES[0]} />
      </AuthProvider>,
    );
    act(() => vi.advanceTimersByTime(220));
    expect(screen.getByTestId("score-value").textContent).not.toBe("0");
  });
  it("stops increasing the score while paused", () => {
    render(
      <AuthProvider>
        <PlayerScreen game={GAMES[0]} />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByText("PAUSA"));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("score-value").textContent).toBe("0");
  });
  it("shows the game-over modal when FIN is clicked, and saves a score", () => {
    render(
      <AuthProvider>
        <PlayerScreen game={GAMES[0]} />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByText("FIN"));
    expect(screen.getByText("FIN DEL JUEGO")).toBeInTheDocument();
    expect(screen.getByText("VOLVER AL VAULT")).toHaveAttribute(
      "href",
      "/biblioteca",
    );
    fireEvent.click(screen.getByText("GUARDAR PUNTUACIÓN"));
    expect(screen.getByText("▸ PUNTUACIÓN GUARDADA_")).toBeInTheDocument();
    expect(localStorage.getItem("av_scores")).not.toBeNull();
  });
  it("shows the stored player's name after hydration", async () => {
    vi.useRealTimers();
    localStorage.setItem("av_user", JSON.stringify({ name: "PX_KAI" }));
    const markup = renderToString(
      <AuthProvider>
        <PlayerScreen game={GAMES[0]} />
      </AuthProvider>,
    );
    const container = document.createElement("div");
    container.innerHTML = markup;
    document.body.append(container);
    const root = hydrateRoot(
      container,
      <AuthProvider>
        <PlayerScreen game={GAMES[0]} />
      </AuthProvider>,
    );
    await act(async () => {});
    expect(container.querySelector(".hud-stat .v")?.textContent).toBe("PX_KAI");
    root.unmount();
    container.remove();
  });
});
