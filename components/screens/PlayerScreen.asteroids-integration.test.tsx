import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PlayerScreen from "./PlayerScreen";
import { AuthProvider } from "@/components/AuthProvider";
import { GAMES } from "@/lib/data";
import { stubContext } from "@/lib/asteroids/testing";

const rocas = GAMES.find((game) => game.id === "rocas")!;
let frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;

beforeEach(() => {
  frames = new Map();
  nextFrame = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    nextFrame++;
    frames.set(nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    stubContext().ctx as never,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PlayerScreen asteroids canvas integration", () => {
  it("hands Space to the score input after FIN and captures it again on replay", () => {
    render(
      <AuthProvider>
        <PlayerScreen game={rocas} />
      </AuthProvider>,
    );

    const runningSpace = new KeyboardEvent("keydown", { code: "Space", cancelable: true });
    window.dispatchEvent(runningSpace);
    expect(runningSpace.defaultPrevented).toBe(true);
    expect(frames.size).toBe(1);

    fireEvent.click(screen.getByText("FIN"));
    expect(screen.getByText("FIN DEL JUEGO")).toBeInTheDocument();
    const input = screen.getByRole("textbox");
    const dialogSpace = new KeyboardEvent("keydown", { bubbles: true, code: "Space", cancelable: true });
    input.dispatchEvent(dialogSpace);
    expect(dialogSpace.defaultPrevented).toBe(false);
    fireEvent.change(input, { target: { value: "abc" } });
    expect(input).toHaveValue("ABC");
    expect(frames.size).toBe(0);

    fireEvent.click(screen.getByText("JUGAR DE NUEVO"));
    const replaySpace = new KeyboardEvent("keydown", { code: "Space", cancelable: true });
    window.dispatchEvent(replaySpace);
    expect(replaySpace.defaultPrevented).toBe(true);
    expect(frames.size).toBe(1);
  });
});
