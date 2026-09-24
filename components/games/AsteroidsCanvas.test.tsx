import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import AsteroidsCanvas from "./AsteroidsCanvas";
import { Asteroid, H, W } from "@/lib/asteroids/entities";
import { AsteroidsGame, MAX_DT } from "@/lib/asteroids/game";
import { seeded, stubContext } from "@/lib/asteroids/testing";

let frames: FrameRequestCallback[];
const cancelFrame = vi.fn();
let context: ReturnType<typeof stubContext>;

beforeEach(() => {
  frames = [];
  cancelFrame.mockClear();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
  context = stubContext();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context.ctx as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const step = (ts: number) =>
  act(() => {
    frames.shift()?.(ts);
  });

const press = (type: "keydown" | "keyup", code: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent(type, { code, cancelable: true, ...init });
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

  it("maps held keys and a one-frame shot into game input", () => {
    const game = new AsteroidsGame(seeded(1));
    const update = vi.spyOn(game, "update");
    render(<AsteroidsCanvas running createGame={() => game} {...props()} />);

    press("keydown", "ArrowLeft");
    press("keydown", "ArrowRight");
    press("keydown", "ArrowUp");
    press("keydown", "Space");
    step(0);
    expect(update).toHaveBeenLastCalledWith(0, { left: true, right: true, thrust: true, shoot: true });
    step(10);
    expect(update).toHaveBeenLastCalledWith(0.01, { left: true, right: true, thrust: true, shoot: false });
    press("keyup", "ArrowLeft");
    press("keyup", "ArrowRight");
    press("keyup", "ArrowUp");
    step(20);
    expect(update).toHaveBeenLastCalledWith(0.01, { left: false, right: false, thrust: false, shoot: false });
  });

  it("maps each arrow key to its own input", () => {
    const game = new AsteroidsGame(seeded(1));
    const update = vi.spyOn(game, "update");
    render(<AsteroidsCanvas running createGame={() => game} {...props()} />);
    const cases = [
      ["ArrowLeft", "left"],
      ["ArrowRight", "right"],
      ["ArrowUp", "thrust"],
    ] as const;
    let now = 0;
    for (const [code, field] of cases) {
      press("keydown", code);
      now += 10;
      step(now);
      expect(update).toHaveBeenLastCalledWith(expect.any(Number), {
        left: false,
        right: false,
        thrust: false,
        shoot: false,
        [field]: true,
      });
      press("keyup", code);
    }
  });

  it("prevents repeated game key presses without shooting", () => {
    const game = new AsteroidsGame(seeded(1));
    const update = vi.spyOn(game, "update");
    render(<AsteroidsCanvas running createGame={() => game} {...props()} />);
    expect(press("keydown", "Space", { repeat: true }).defaultPrevented).toBe(true);
    step(0);
    expect(update).toHaveBeenLastCalledWith(0, expect.objectContaining({ shoot: false }));
  });

  it("uses zero for the first frame, elapsed time thereafter, and caps long gaps", () => {
    const game = new AsteroidsGame(seeded(1));
    const update = vi.spyOn(game, "update");
    render(<AsteroidsCanvas running createGame={() => game} {...props()} />);
    step(100);
    step(125);
    step(1000);
    expect(update.mock.calls.map(([dt]) => dt)).toEqual([0, 0.025, MAX_DT]);
  });

  it("does not repeat unchanged stats, but reports a changed score", () => {
    const game = new AsteroidsGame(seeded(1));
    const p = props();
    render(<AsteroidsCanvas running createGame={() => game} {...p} />);
    step(0);
    step(10);
    expect(p.onStats).toHaveBeenCalledTimes(1);
    game.score = 99;
    step(20);
    expect(p.onStats).toHaveBeenLastCalledWith({ score: 99, lives: 3, level: 1 });
  });

  it("uses the latest callbacks without restarting its frame loop", () => {
    const game = new AsteroidsGame(seeded(1));
    const first = props();
    const { rerender } = render(<AsteroidsCanvas running createGame={() => game} {...first} />);
    step(0);
    const latest = props();
    rerender(<AsteroidsCanvas running createGame={() => game} {...latest} />);
    expect(cancelFrame).not.toHaveBeenCalled();
    game.score = 7;
    step(10);
    expect(latest.onStats).toHaveBeenCalledWith({ score: 7, lives: 3, level: 1 });
    expect(first.onStats).toHaveBeenCalledTimes(1);
    game.state = "gameover";
    step(20);
    expect(latest.onGameOver).toHaveBeenCalledTimes(1);
    expect(first.onGameOver).not.toHaveBeenCalled();
  });

  it("draws a paused frame without scheduling animation", () => {
    render(<AsteroidsCanvas running={false} {...props()} />);
    expect(context.calls.some((call) => call.name === "fillRect")).toBe(true);
    expect(frames).toHaveLength(0);
  });
});
