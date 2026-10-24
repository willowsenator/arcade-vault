import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PlayerScreen from "./PlayerScreen";
import { AuthProvider } from "@/components/AuthProvider";
import { GAMES } from "@/lib/data";
import type { EngineCanvasProps } from "@/components/games/engines";

vi.mock("@/lib/score-queries", () => ({ insertScore: vi.fn() }));
vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/components/games/AsteroidsCanvas", () => ({
  default: () => <div data-testid="asteroids-canvas" />,
}));
vi.mock("@/components/games/BloqueBusterCanvas", () => ({
  default: (props: EngineCanvasProps) => (
    <div data-testid="bloque-buster-canvas" data-running={String(props.running)}>
      <button onClick={() => props.onStats({ score: 340, lives: 2, level: 3 })}>emit-stats</button>
      <button onClick={props.onGameOver}>emit-over</button>
    </div>
  ),
}));

const renderPlayer = (id = "bloque-buster") => render(
  <AuthProvider>
    <PlayerScreen game={GAMES.find((game) => game.id === id)!} />
  </AuthProvider>,
);

beforeEach(() => localStorage.clear());

describe("PlayerScreen with the bloque-buster engine", () => {
  it("renders the block canvas and its MOVER hint", () => {
    renderPlayer();
    expect(screen.getByTestId("bloque-buster-canvas")).toBeInTheDocument();
    expect(screen.queryByTestId("asteroids-canvas")).toBeNull();
    expect(screen.getByText("← → / A D MOVER · RATÓN MOVER · P PAUSA")).toBeInTheDocument();
  });

  it("updates the score, lives and level from emitted stats", () => {
    renderPlayer();
    fireEvent.click(screen.getByText("emit-stats"));
    expect(screen.getByTestId("score-value")).toHaveTextContent("340");
    expect(screen.getByTestId("lives-value")).toHaveTextContent("♥ ♥");
    expect(screen.getByTestId("level-value")).toHaveTextContent("03");
  });

  it("pauses and resumes with KeyP and ignores key repeat", () => {
    renderPlayer();
    expect(screen.getByRole("button", { name: "PAUSA" })).toHaveAttribute("aria-keyshortcuts", "P");
    const canvas = screen.getByTestId("bloque-buster-canvas");
    fireEvent.keyDown(window, { code: "KeyP" });
    expect(screen.getByText("EN PAUSA")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("EN PAUSA");
    expect(screen.getByRole("button", { name: "REANUDAR" })).toHaveAttribute("aria-keyshortcuts", "P");
    expect(canvas).toHaveAttribute("data-running", "false");
    fireEvent.keyDown(window, { code: "KeyP", repeat: true });
    expect(canvas).toHaveAttribute("data-running", "false");
    fireEvent.keyDown(window, { code: "KeyP" });
    expect(screen.queryByText("EN PAUSA")).toBeNull();
    expect(canvas).toHaveAttribute("data-running", "true");
  });

  it("ignores KeyP once the game-over modal is open", () => {
    renderPlayer();
    fireEvent.click(screen.getByText("emit-over"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { code: "KeyP" });
    expect(screen.queryByText("EN PAUSA")).toBeNull();
    expect(screen.getByTestId("bloque-buster-canvas")).toHaveAttribute("data-running", "false");
    expect(screen.getByRole("textbox")).toHaveFocus();
  });

  it.each(["ctrlKey", "metaKey", "altKey"])("ignores KeyP with %s without preventing its default", (modifier) => {
    renderPlayer();
    const event = new KeyboardEvent("keydown", { code: "KeyP", [modifier]: true, cancelable: true });
    fireEvent(window, event);
    expect(event.defaultPrevented).toBe(false);
    expect(screen.getByTestId("bloque-buster-canvas")).toHaveAttribute("data-running", "true");
  });

  it("still pauses with Shift+P", () => {
    renderPlayer();
    fireEvent.keyDown(window, { code: "KeyP", shiftKey: true });
    expect(screen.getByTestId("bloque-buster-canvas")).toHaveAttribute("data-running", "false");
  });

  it.each(["input", "textarea", "select", "contenteditable"])("ignores KeyP from %s without preventing its default", (target) => {
    renderPlayer();
    const { container } = render(target === "contenteditable"
      ? <div contentEditable />
      : target === "textarea" ? <textarea />
      : target === "select" ? <select /> : <input />);
    const editable = container.firstElementChild!;
    if (target === "contenteditable") {
      // jsdom does not implement isContentEditable.
      Object.defineProperty(editable, "isContentEditable", { value: true });
    }
    const event = new KeyboardEvent("keydown", { code: "KeyP", bubbles: true, cancelable: true });
    fireEvent(editable, event);
    expect(event.defaultPrevented).toBe(false);
    expect(screen.getByTestId("bloque-buster-canvas")).toHaveAttribute("data-running", "true");
  });

  it("also toggles pause for ROCAS", () => {
    renderPlayer("rocas");
    fireEvent.keyDown(window, { code: "KeyP" });
    expect(screen.getByText("EN PAUSA")).toBeInTheDocument();
    fireEvent.keyDown(window, { code: "KeyP" });
    expect(screen.queryByText("EN PAUSA")).toBeNull();
  });

  it("does not toggle pause for games without an engine", () => {
    renderPlayer("caida");
    fireEvent.keyDown(window, { code: "KeyP" });
    expect(screen.queryByText("EN PAUSA")).toBeNull();
  });
});
