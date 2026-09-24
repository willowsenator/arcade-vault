import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import AsteroidsCanvas from "./AsteroidsCanvas";
import { Asteroid, H, W } from "@/lib/asteroids/entities";
import { AsteroidsGame } from "@/lib/asteroids/game";
import { seeded, stubContext } from "@/lib/asteroids/testing";

let frames: FrameRequestCallback[];
const cancelFrame = vi.fn();

beforeEach(() => {
  frames = [];
  cancelFrame.mockClear();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    stubContext().ctx as never,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const step = (ts: number) =>
  act(() => {
    frames.shift()?.(ts);
  });

const press = (type: "keydown" | "keyup", code: string) => {
  const event = new KeyboardEvent(type, { code, cancelable: true });
  window.dispatchEvent(event);
  return event;
};

const props = () => ({ onStats: vi.fn(), onGameOver: vi.fn() });

describe("AsteroidsCanvas", () => {
  it("reports the starting stats on the first frame", () => {
    const p = props();
    render(<AsteroidsCanvas running {...p} />);
    step(0);
    expect(p.onStats).toHaveBeenCalledWith({ score: 0, lives: 3, level: 1 });
  });

  it("schedules no frames while not running, and resumes when running again", () => {
    const p = props();
    const { rerender } = render(<AsteroidsCanvas running={false} {...p} />);
    expect(frames).toHaveLength(0);
    rerender(<AsteroidsCanvas running {...p} />);
    expect(frames).toHaveLength(1);
  });

  it("captures game keys while running, on keydown and keyup", () => {
    render(<AsteroidsCanvas running {...props()} />);
    expect(press("keydown", "Space").defaultPrevented).toBe(true);
    expect(press("keyup", "Space").defaultPrevented).toBe(true);
    expect(press("keydown", "ArrowUp").defaultPrevented).toBe(true);
    expect(press("keydown", "KeyA").defaultPrevented).toBe(false);
  });

  it("releases the keyboard while not running so a dialog can use it", () => {
    render(<AsteroidsCanvas running={false} {...props()} />);
    expect(press("keydown", "Space").defaultPrevented).toBe(false);
  });

  it("cancels its frame and detaches key listeners on unmount", () => {
    const { unmount } = render(<AsteroidsCanvas running {...props()} />);
    unmount();
    expect(cancelFrame).toHaveBeenCalled();
    expect(press("keydown", "Space").defaultPrevented).toBe(false);
  });

  it("reports stats then game over exactly once and stops scheduling frames", () => {
    const p = props();
    const createGame = () => {
      const game = new AsteroidsGame(seeded(3));
      game.lives = 1;
      game.asteroids = [new Asteroid(seeded(4), W / 2, H / 2, 3)];
      game.ship.invincible = 0;
      return game;
    };
    render(<AsteroidsCanvas running createGame={createGame} {...p} />);
    step(0);

    expect(p.onStats).toHaveBeenLastCalledWith({ score: 0, lives: 0, level: 1 });
    expect(p.onGameOver).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(0);
    expect(p.onStats.mock.invocationCallOrder.at(-1)!).toBeLessThan(
      p.onGameOver.mock.invocationCallOrder[0],
    );
  });
});
