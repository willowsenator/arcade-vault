import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PlayerScreen from "./PlayerScreen";
import { AuthProvider } from "@/components/AuthProvider";
import { GAMES } from "@/lib/data";
import { ENGINES, type EngineCanvasProps } from "@/components/games/engines";

vi.mock("@/lib/score-queries", () => ({ insertScore: vi.fn() }));
vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/components/games/TetrisCanvas", () => ({
  default: (props: EngineCanvasProps) => (
    <div data-testid="tetris-canvas" data-running={String(props.running)}>
      <button onClick={() => props.onStats({ score: 1200, lives: 1, level: 2 })}>emit-stats</button>
    </div>
  ),
}));

const renderPlayer = () => render(
  <AuthProvider>
    <PlayerScreen game={GAMES.find((game) => game.id === "caida")!} />
  </AuthProvider>,
);

beforeEach(() => localStorage.clear());

describe("PlayerScreen with the tetris engine", () => {
  it("renders the falling-pieces canvas with its controls hint", () => {
    renderPlayer();
    expect(screen.getByTestId("tetris-canvas")).toBeInTheDocument();
    expect(screen.getByText(ENGINES.tetris.controlsHint)).toBeInTheDocument();
  });

  it("starts with a single life", () => {
    renderPlayer();
    expect(screen.getByTestId("lives-value")).toHaveTextContent(/^♥$/);
  });

  it("takes score and level from the engine", () => {
    renderPlayer();
    fireEvent.click(screen.getByText("emit-stats"));
    expect(screen.getByTestId("score-value")).toHaveTextContent("1200");
    expect(screen.getByTestId("level-value")).toHaveTextContent("02");
  });

  it("pauses and resumes with KeyP", () => {
    renderPlayer();
    const canvas = screen.getByTestId("tetris-canvas");
    fireEvent.keyDown(window, { code: "KeyP" });
    expect(screen.getByText("EN PAUSA")).toBeInTheDocument();
    expect(canvas).toHaveAttribute("data-running", "false");
    fireEvent.keyDown(window, { code: "KeyP" });
    expect(canvas).toHaveAttribute("data-running", "true");
  });
});
