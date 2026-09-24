import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import PlayerScreen from "./PlayerScreen";
import { AuthProvider } from "@/components/AuthProvider";
import { GAMES } from "@/lib/data";
import { getSavedScores } from "@/lib/scores";

const mounts = vi.hoisted(() => ({ count: 0 }));

vi.mock("@/components/games/AsteroidsCanvas", async () => {
  const { useEffect } = await import("react");
  function AsteroidsCanvasMock(props: {
    running: boolean;
    onStats: (s: { score: number; lives: number; level: number }) => void;
    onGameOver: () => void;
  }) {
    useEffect(() => {
      mounts.count++;
    }, []);
    return (
      <div data-testid="asteroids-canvas" data-running={String(props.running)}>
        <button onClick={() => props.onStats({ score: 340, lives: 2, level: 3 })}>
          emit-stats
        </button>
        <button onClick={props.onGameOver}>emit-over</button>
      </div>
    );
  }
  return {
    default: AsteroidsCanvasMock,
  };
});

const rocas = GAMES.find((g) => g.id === "rocas")!;
const renderPlayer = (game = rocas) =>
  render(
    <AuthProvider>
      <PlayerScreen game={game} />
    </AuthProvider>,
  );

describe("PlayerScreen with the asteroids engine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    mounts.count = 0;
  });
  afterEach(() => vi.useRealTimers());

  it("renders the canvas instead of the mock arena and never ticks a fake score", () => {
    const { container } = renderPlayer();
    expect(screen.getByTestId("asteroids-canvas")).toBeInTheDocument();
    expect(container.querySelector(".enemy")).toBeNull();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("score-value").textContent).toBe("0");
  });

  it("shows the real score, lives and level from the game", () => {
    renderPlayer();
    fireEvent.click(screen.getByText("emit-stats"));
    expect(screen.getByTestId("score-value").textContent).toBe("340");
    expect(screen.getByTestId("lives-value").textContent).toBe("♥ ♥");
    expect(screen.getByTestId("level-value").textContent).toBe("03");
  });

  it("stops and resumes the game with PAUSA / REANUDAR", () => {
    renderPlayer();
    const canvas = screen.getByTestId("asteroids-canvas");
    expect(canvas).toHaveAttribute("data-running", "true");
    fireEvent.click(screen.getByText("PAUSA"));
    expect(canvas).toHaveAttribute("data-running", "false");
    fireEvent.click(screen.getByText("REANUDAR"));
    expect(canvas).toHaveAttribute("data-running", "true");
  });

  it("opens the final dialog with the real score and saves it under rocas", () => {
    renderPlayer();
    fireEvent.click(screen.getByText("emit-stats"));
    fireEvent.click(screen.getByText("emit-over"));
    expect(screen.getByText("FIN DEL JUEGO")).toBeInTheDocument();
    expect(screen.getByTestId("asteroids-canvas")).toHaveAttribute("data-running", "false");

    fireEvent.click(screen.getByText("GUARDAR PUNTUACIÓN"));
    expect(getSavedScores()).toMatchObject([{ game: "rocas", score: 340 }]);
  });

  it("opens the dialog when FIN is pressed mid-game", () => {
    renderPlayer();
    fireEvent.click(screen.getByText("FIN"));
    expect(screen.getByText("FIN DEL JUEGO")).toBeInTheDocument();
  });

  it("JUGAR DE NUEVO mounts a brand-new game and resets the HUD", () => {
    renderPlayer();
    fireEvent.click(screen.getByText("emit-stats"));
    fireEvent.click(screen.getByText("FIN"));
    expect(mounts.count).toBe(1);

    fireEvent.click(screen.getByText("JUGAR DE NUEVO"));
    expect(mounts.count).toBe(2);
    expect(screen.getByTestId("score-value").textContent).toBe("0");
    expect(screen.getByTestId("lives-value").textContent).toBe("♥ ♥ ♥");
    expect(screen.getByTestId("level-value").textContent).toBe("01");
    expect(screen.getByTestId("asteroids-canvas")).toHaveAttribute("data-running", "true");
  });

  it("shows the controls hint in Spanish", () => {
    renderPlayer();
    expect(screen.getByText(/ROTAR.*IMPULSO.*DISPARAR/)).toBeInTheDocument();
  });

  it("keeps the mock player for games without an engine", () => {
    const { container } = renderPlayer(GAMES[0]);
    expect(screen.queryByTestId("asteroids-canvas")).toBeNull();
    expect(container.querySelector(".enemy")).not.toBeNull();
    expect(screen.getByTestId("lives-value").textContent).toBe("♥ ♥ ♥");
  });
});
